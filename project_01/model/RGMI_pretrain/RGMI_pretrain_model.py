import argparse
import os
import time
import requests
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, GATv2Conv
from torch_geometric.data import Data
import numpy as np
import scipy.sparse as sp
from sklearn.metrics.pairwise import rbf_kernel
from scipy.sparse import coo_matrix
from tqdm import tqdm

# 添加全局变量来存储已加载的模型和模型状态
loaded_model = None
loaded_embeddings = None
loaded_miRNA_embeddings = None
loaded_disease_ids = {}

# 模型定义部分
class GCN(nn.Module):
    def __init__(self, nfeat, nhid):
        super(GCN, self).__init__()
        self.conv1 = GCNConv(nfeat, nhid, bias=True)
        self.conv2 = GCNConv(nhid, nhid, bias=True)

    def forward(self, data):
        x = self.conv1(data.x, data.edge_index, data.edge_weight)
        x = F.leaky_relu(x)
        x = self.conv2(x, data.edge_index, data.edge_weight)
        return x

class GATv2(nn.Module):
    def __init__(self, nfeat, nhid, heads=2, dropout=0.4):
        super(GATv2, self).__init__()
        self.conv1 = GATv2Conv(nfeat, nhid, heads=heads, dropout=dropout, edge_dim=1, add_self_loops=True)
        self.conv2 = GATv2Conv(nhid * heads, nhid, heads=1, dropout=dropout, edge_dim=1, add_self_loops=True)

    def forward(self, data):
        x = self.conv1(data.x, data.edge_index, edge_attr=data.edge_weight.unsqueeze(-1))
        x = F.leaky_relu(x)
        x = self.conv2(x, data.edge_index, edge_attr=data.edge_weight.unsqueeze(-1))
        return x

class BilinearTower(nn.Module):
    def __init__(self, in_dim, h_dim, dropout=0.2):
        super(BilinearTower, self).__init__()
        self.in_dim = in_dim
        self.h_dim = h_dim
        self.proj = nn.Linear(in_dim, h_dim)
        self.W = nn.Parameter(torch.randn(h_dim, h_dim))
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        x = self.proj(x)
        x = self.dropout(x)
        bilinear = torch.einsum('bi,ij,bj->b', x, self.W, x)
        return bilinear.unsqueeze(-1)

class WeightedAggregator(nn.Module):
    def __init__(self, h_dim):
        super(WeightedAggregator, self).__init__()
        self.h_dim = h_dim
        self.weight_mlp = nn.Sequential(
            nn.Linear(h_dim, h_dim // 2),
            nn.ReLU(),
            nn.Linear(h_dim // 2, 1),
            nn.Sigmoid()
        )

    def forward(self, h, adj):
        weights = self.weight_mlp(h)
        adj_dense = adj.to_dense()
        weighted_h = h * weights
        d_h = torch.mm(adj_dense, weighted_h)
        weight_sum = torch.mm(adj_dense, weights).clamp(min=1e-8)
        d_h = d_h / weight_sum
        return d_h

class RGMI(nn.Module):
    def __init__(self, g_encoder, m_encoder, gene_tower, miRNA_tower, h_dim):
        super(RGMI, self).__init__()
        self.g_encoder = g_encoder
        self.m_encoder = m_encoder
        self.gene_tower = gene_tower
        self.miRNA_tower = miRNA_tower
        self.gene_agg = WeightedAggregator(h_dim)
        self.miRNA_agg = WeightedAggregator(h_dim)
        self.prev_g_score = None
        self.prev_m_score = None

    def forward(self, g_data, m_data, d2g, m2d):
        g_h = self.g_encoder(g_data)
        m_h = self.m_encoder(m_data)
        d_h_gene = self.gene_agg(g_h, d2g)
        d_h_miRNA = self.miRNA_agg(m_h, m2d)
        return g_h, m_h, d_h_gene, d_h_miRNA

    def update_prev_scores(self, g_score, m_score):
        self.prev_g_score = g_score.detach() if g_score is not None else None
        self.prev_m_score = m_score.detach() if m_score is not None else None

# 数据处理工具函数
def load_sparse(path):
    data = np.load(path, allow_pickle=True)
    keys = list(data.keys())
    print(f"Keys found in {path}: {keys}")

    if all(k in keys for k in ['data', 'indices', 'indptr', 'shape']):
        return sp.csr_matrix((data['data'], data['indices'], data['indptr']), shape=data['shape']).tocoo()
    elif all(k in keys for k in ['data', 'col', 'ptr', 'shape']):
        return sp.csr_matrix((data['data'], data['col'], data['ptr']), shape=data['shape']).tocoo()
    elif all(k in keys for k in ['data', 'row', 'col']):
        shape = data.get('shape', (np.max(data['row']) + 1, np.max(data['col']) + 1))
        return sp.coo_matrix((data['data'], (data['row'], data['col'])), shape=shape)
    elif 'matrix' in keys:
        matrix = data['matrix'].item() if data['matrix'].dtype == np.object_ else data['matrix']
        return matrix.tocoo() if sp.issparse(matrix) else matrix
    else:
        row_keys = [k for k in keys if 'row' in k.lower()]
        col_keys = [k for k in keys if 'col' in k.lower() or 'ind' in k.lower()]
        data_keys = [k for k in keys if 'data' in k.lower()]
        if row_keys and col_keys and data_keys:
            row = data[row_keys[0]]
            col = data[col_keys[0]]
            values = data[data_keys[0]]
            shape = data.get('shape', (np.max(row) + 1, np.max(col) + 1))
            return sp.coo_matrix((values, (row, col)), shape=shape)
        if len(keys) == 1:
            arr = data[keys[0]]
            return arr.tocoo() if sp.issparse(arr) else sp.coo_matrix(arr)
        raise ValueError(f"Cannot determine sparse matrix format from keys: {keys}")

def sparse_to_tuple(sparse_mx):
    if not sp.isspmatrix_coo(sparse_mx):
        sparse_mx = sparse_mx.tocoo()
    coords = np.vstack((sparse_mx.row, sparse_mx.col)).transpose()
    values = sparse_mx.data
    shape = sparse_mx.shape
    return coords, values, shape

def mx_to_torch_sparse_tensor(mx):
    sparse_mx = mx.astype(np.float32)
    sparse_mx.eliminate_zeros()
    indices = torch.from_numpy(np.vstack((sparse_mx.row, sparse_mx.col)).astype(np.int64))
    values = torch.from_numpy(sparse_mx.data)
    size = torch.Size(sparse_mx.shape)
    return torch.sparse_coo_tensor(indices, values, size)

def generate_sparse_one_hot(num_ents, dtype=torch.float32):
    diag_range = torch.tensor(list(range(num_ents)))
    return torch.sparse_coo_tensor(
        indices=torch.vstack([diag_range, diag_range]),
        values=torch.ones(num_ents, dtype=dtype),
        size=(num_ents, num_ents))

def load_triples(path):
    train_total, triples = 0, []
    with open(path + "/train2id.txt", "r") as f:
        train_total = int(f.readline())
        for line in f:
            h, r, t = line.strip().split()
            triples.append((int(h), int(r), int(t)))
    print(f"GO({train_total}) datasets loaded.")
    return triples

def generate_inverses(triples, num_rels):
    triples = torch.tensor(triples, dtype=torch.long)
    inverse_relations = torch.cat([triples[:, 2, None], triples[:, 1, None] + num_rels, triples[:, 0, None]], dim=1)
    return inverse_relations

def get_kg_data(triples, num_rels):
    triples = torch.tensor(triples, dtype=torch.long)
    inverse_triples = generate_inverses(triples, num_rels)
    triples = torch.cat([triples, inverse_triples], dim=0)
    edge_index = torch.cat([triples[:, 0, None], triples[:, 2, None]], dim=1).permute(1, 0)
    edge_type = triples[:, 1, None].view(-1)
    return edge_index, edge_type

def load_disease_mapping(data_path):
    dis_name_to_idx, idx_to_dis_name = {}, {}
    # 确保使用正确的路径分隔符
    file_path = os.path.join(data_path, "dis2id.txt")
    
    print(f"Reading disease mapping from: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                items = line.strip().split()
                if len(items) >= 2:
                    dis_name, idx = items[0], int(items[1])
                    dis_name_to_idx[dis_name] = idx
                    idx_to_dis_name[idx] = dis_name
    except Exception as e:
        print(f"Error reading disease mapping file: {e}")
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Disease mapping file not found: {file_path}")
        # 检查文件编码
        try:
            with open(file_path, "r", errors="replace") as f:
                content = f.read(1000)  # 读取前1000个字符
                print(f"File content sample: {content}")
        except Exception as e2:
            print(f"Error reading file with replacement: {e2}")
        raise
        
    print(f"Loaded {len(dis_name_to_idx)} disease mappings")
    return dis_name_to_idx, idx_to_dis_name

def load_entity_mapping(file_path, entity_type):
    name_to_idx, idx_to_name = {}, {}
    print(f"Reading {entity_type} mapping from: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                items = line.strip().split('\t')
                if len(items) >= 2:
                    name, idx = items[0], int(items[1])
                    name_to_idx[name] = idx
                    idx_to_name[idx] = name
    except Exception as e:
        print(f"Error reading {entity_type} mapping file: {e}")
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"{entity_type} mapping file not found: {file_path}")
        # 尝试不同的分隔符
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    items = line.strip().split()
                    if len(items) >= 2:
                        name, idx = items[0], int(items[1])
                        name_to_idx[name] = idx
                        idx_to_name[idx] = name
            print(f"Successfully loaded {entity_type} mapping using space as separator")
            return idx_to_name  # 只返回idx_to_name映射
        except Exception as e2:
            print(f"Error with alternative parsing: {e2}")
            raise
            
    print(f"Loaded {len(name_to_idx)} {entity_type} mappings")
    return idx_to_name  # 只返回idx_to_name映射

def construct_miRNA_disease_network(path):
    dName_to_idx, dIdx_to_name = load_disease_mapping(path + "/dis2id.txt")
    mIdx_to_name = load_entity_mapping(path + "/miRNA2id.txt", "miRNA")
    
    # 创建反向映射
    mName_to_idx = {name: idx for idx, name in mIdx_to_name.items()}
    
    m2d_adj = np.zeros((len(mIdx_to_name), len(dIdx_to_name)))
    m2d_row, m2d_col = [], []
    
    with open(path + '/miRNA2disease.txt') as f:
        f.readline()
        for line in f:
            miRNA, dis = line.strip().split('\t')
            if miRNA in mName_to_idx and dis in dIdx_to_name:
                m2d_row.append(mName_to_idx[miRNA])
                m2d_col.append(dIdx_to_name[dis])
    
    if m2d_row and m2d_col:
        m2d_adj[m2d_row, m2d_col] = 1
        m2d = coo_matrix((np.ones(len(m2d_row)), (m2d_row, m2d_col)), 
                        shape=(len(mIdx_to_name), len(dIdx_to_name)))
        sp.save_npz(path + "/miRNA2disease.npz", m2d, compressed=True)
    else:
        print("警告：没有找到有效的miRNA-疾病关联")
        
    return m2d_adj

def construct_miRNA_similarity_network(path, m2d_adj):
    miRNA_similarity = rbf_kernel(m2d_adj)
    miRNA_similarity_2 = (miRNA_similarity - np.min(miRNA_similarity)) / (np.max(miRNA_similarity) - np.min(miRNA_similarity))
    data = miRNA_similarity_2.reshape(-1)
    index = np.where(data >= 0.8)
    data = data[index]
    row, col = np.where(miRNA_similarity_2 >= 0.8)
    m2m = coo_matrix((data, (row, col)), shape=(miRNA_similarity_2.shape[0], miRNA_similarity_2.shape[1]))
    sp.save_npz(path + "/miRNA2miRNA.npz", m2m, compressed=True)

def construct_gene_miRNA_network(path):
    gIdx_to_name = load_entity_mapping(path + "/gene2id.txt", "gene")
    mIdx_to_name = load_entity_mapping(path + "/miRNA2id.txt", "miRNA")
    
    # 创建反向映射
    gName_to_idx = {name: idx for idx, name in gIdx_to_name.items()}
    mName_to_idx = {name: idx for idx, name in mIdx_to_name.items()}
    
    g2m_adj = np.zeros((len(gIdx_to_name), len(mIdx_to_name)))
    g2m_row, g2m_col = [], []
    
    with open(path + '/gene2miRNA.txt') as f:
        f.readline()
        for line in f:
            gene, miRNA = line.strip().split('\t')
            if gene in gName_to_idx and miRNA in mName_to_idx:
                g2m_row.append(gName_to_idx[gene])
                g2m_col.append(mName_to_idx[miRNA])
    
    if g2m_row and g2m_col:
        g2m_adj[g2m_row, g2m_col] = 1
        g2m = coo_matrix((np.ones(len(g2m_row)), (g2m_row, g2m_col)), 
                        shape=(len(gIdx_to_name), len(mIdx_to_name)))
        sp.save_npz(path + "/gene2miRNA.npz", g2m, compressed=True)
    else:
        print("警告：没有找到有效的基因-miRNA关联")
        
    return g2m_adj

# 主程序部分
def fetch_disease_info(disease_id):
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    try:
        search_url = f"{base_url}esearch.fcgi?db=medgen&term={disease_id}&retmode=json"
        search_response = requests.get(search_url)
        if search_response.status_code != 200:
            return {"disease_id": disease_id, "error": f"Search failed: HTTP {search_response.status_code}"}
        search_data = search_response.json()
        if "esearchresult" not in search_data or not search_data["esearchresult"]["idlist"]:
            return {"disease_id": disease_id, "error": "No records found"}
        medgen_id = search_data["esearchresult"]["idlist"][0]
        summary_url = f"{base_url}esummary.fcgi?db=medgen&id={medgen_id}&retmode=json"
        summary_response = requests.get(summary_url)
        if summary_response.status_code != 200:
            return {"disease_id": disease_id, "error": f"Summary failed: HTTP {summary_response.status_code}"}
        summary_data = summary_response.json()
        result = summary_data["result"][medgen_id]
        disease_name = result.get("title", "Unknown name")
        definition = result.get("definition", {}).get("value", "No definition") if isinstance(result.get("definition"), dict) else "No definition"
        semantic_type = result.get("semantictype", {}).get("value", "") if isinstance(result.get("semantictype"), dict) else ""
        return {
            "disease_id": disease_id,
            "name": disease_name,
            "definition": definition,
            "attributes": {"semantictype": semantic_type}
        }
    except Exception as e:
        return {"disease_id": disease_id, "error": f"Fetch failed: {str(e)}"}

def find_similar_diseases(disease_id, d_h_gene, d_h_miRNA, dis_name_to_idx, idx_to_dis_name, top_n=10):
    if disease_id not in dis_name_to_idx:
        print(f"Error: Disease ID {disease_id} not found")
        return []
    idx = dis_name_to_idx[disease_id]
    target_gene = d_h_gene[idx].unsqueeze(0)
    target_miRNA = d_h_miRNA[idx].unsqueeze(0)
    gene_sim = torch.nn.functional.cosine_similarity(target_gene, d_h_gene)
    miRNA_sim = torch.nn.functional.cosine_similarity(target_miRNA, d_h_miRNA)
    combined_sim = (gene_sim + miRNA_sim) / 2
    combined_sim[idx] = -float("inf")
    top_indices = torch.topk(combined_sim, k=top_n).indices.cpu().numpy()
    top_scores = torch.topk(combined_sim, k=top_n).values.cpu().numpy()
    return [(idx.item(), score.item(), idx_to_dis_name.get(idx.item(), f"Unknown_{idx}")) for idx, score in zip(top_indices, top_scores)]

def get_associated_entities(disease_idx, d2g, m2d_raw, gene_mapping, miRNA_mapping, top_n_entities=10):
    """获取疾病关联的基因和 miRNA（返回名称），m2d_raw 是未转置的矩阵"""
    d2g_dense = d2g.to_dense().cpu().numpy()
    m2d_dense = m2d_raw.to_dense().cpu().numpy()

    gene_indices = np.where(d2g_dense[disease_idx] > 0)[0]
    gene_scores = d2g_dense[disease_idx][gene_indices]
    top_gene_indices = gene_indices[np.argsort(gene_scores)[::-1][:top_n_entities]]
    top_gene_names = [gene_mapping.get(idx, f"gene_{idx}") for idx in top_gene_indices]

    miRNA_indices = np.where(m2d_dense[:, disease_idx] > 0)[0]
    miRNA_scores = m2d_dense[miRNA_indices, disease_idx]
    top_miRNA_indices = miRNA_indices[np.argsort(miRNA_scores)[::-1][:top_n_entities]]
    top_miRNA_names = [miRNA_mapping.get(idx, f"miRNA_{idx}") for idx in top_miRNA_indices]

    return top_gene_names, top_miRNA_names

def predict_disease_similarity(disease_id, dataset_path=None, top_n=20):     
    """
    预测疾病相似性并返回结果
    
    Args:
        disease_id: 目标疾病ID
        dataset_path: 数据集路径，如果为None则使用环境变量或默认路径
        top_n: 返回的相似疾病数量，默认为20
    
    Returns:
        包含目标疾病及相似疾病信息的列表
    """
    global loaded_model, loaded_embeddings, loaded_miRNA_embeddings, loaded_disease_ids
    
    # 首先尝试从环境变量获取数据集路径
    if dataset_path is None:
        dataset_path = os.environ.get('DATASET_PATH')
        
    # 如果环境变量未设置，则使用默认路径
    if dataset_path is None:
        # 获取当前文件的绝对路径
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # 尝试多种可能的路径
        possible_paths = [
            os.path.join(current_dir, "Dataset"),  # 当前目录下的Dataset
            os.path.join(current_dir, "..", "..", "Dataset"),  # 项目根目录下的Dataset
            "./Dataset"  # 相对路径
        ]
        
        for path in possible_paths:
            if os.path.exists(path) and os.path.isdir(path):
                dataset_path = path
                print(f"找到数据集目录: {dataset_path}")
                break
    
    if dataset_path is None or not os.path.exists(dataset_path):
        raise FileNotFoundError(f"无法找到数据集目录。请提供有效的数据集路径。尝试查找: {possible_paths}")
    
    print(f"使用数据集路径: {dataset_path}")
    
    # 创建参数对象
    class Args:
        def __init__(self):
            self.data = dataset_path
            self.checkpoint = os.path.join(os.path.dirname(os.path.abspath(__file__)), "checkpoint_60.pth.tar")
            self.h_dim = 128
            self.disease_id = disease_id
            self.top_n = top_n
            self.output = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disease_similarity_results.json")
            self.disable_cuda = False
    
    # 设置全局args变量
    global args
    args = Args()
    
    # 检查是否模型已加载，如果已加载，就直接使用现有模型进行预测
    if loaded_model is not None:
        print("使用已加载的模型，无需重新加载...")
        # 使用已加载的模型执行预测
        return predict_with_loaded_model(disease_id, top_n)
    else:
        print("首次加载模型...")
    # 执行主函数并捕获结果
    result = main(return_results=True)
    return result

def predict_with_loaded_model(disease_id, top_n=20):
    """使用已加载的模型进行预测，避免重复加载模型"""
    global loaded_model, loaded_embeddings, loaded_miRNA_embeddings, loaded_disease_ids
    
    # 查找目标疾病的索引
    if disease_id not in loaded_disease_ids:
        print(f"目标疾病ID {disease_id} 不在已加载的疾病ID中")
        return None
    
    target_idx = loaded_disease_ids[disease_id]
    
    # 计算所有疾病与目标疾病的相似度
    similarities = []
    for idx, d_id in enumerate(loaded_disease_ids.keys()):
        if idx != target_idx:  # 排除目标疾病自身
            # 计算余弦相似度
            similarity = F.cosine_similarity(
                loaded_embeddings[target_idx].unsqueeze(0),
                loaded_embeddings[idx].unsqueeze(0)
            ).item()
            similarities.append((d_id, similarity, idx))
    
    # 按相似度降序排序
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    # 获取top_n个相似疾病
    result = []
    
    # 添加目标疾病
    target_disease = {
        "disease_id": disease_id,
        "name": get_disease_name(disease_id),
        "similarity": 1.0,
        "attributes": get_disease_attributes(disease_id, loaded_miRNA_embeddings, loaded_disease_ids)
    }
    result.append(target_disease)
    
    # 添加相似疾病
    for d_id, similarity, _ in similarities[:top_n]:
        similar_disease = {
            "disease_id": d_id,
            "name": get_disease_name(d_id),
            "similarity": similarity,
            "attributes": get_disease_attributes(d_id, loaded_miRNA_embeddings, loaded_disease_ids)
        }
        result.append(similar_disease)
    
    print(f"完成预测，找到 {len(result)-1} 个相似疾病")
    return result

def main(return_results=False):
    global args, loaded_model, loaded_embeddings, loaded_miRNA_embeddings, loaded_disease_ids
    
    # 如果args未定义，则从命令行解析参数
    if 'args' not in globals():
        parser = argparse.ArgumentParser(description="Disease similarity prediction with RGMI model")
        parser.add_argument("--data", default="./Dataset", help="Path to dataset")
        parser.add_argument("--checkpoint", default="./checkpoint_60.pth.tar", help="Model checkpoint path")
        parser.add_argument("--h_dim", default=128, type=int, help="Hidden dimension")
        parser.add_argument("--disease_id", default="C0023212", help="Target disease ID")
        parser.add_argument("--top_n", default=20, type=int, help="Number of similar diseases to return")
        parser.add_argument("--output", default="disease_similarity_results.json", help="Output file path (JSON)")
        parser.add_argument("--disable-cuda", default=False, action="store_true", help="Disable CUDA")
        args = parser.parse_args()
    
    # 确保数据路径存在
    if not os.path.exists(args.data):
        raise FileNotFoundError(f"数据集路径不存在: {args.data}")
        
    # 打印使用的参数
    print(f"\n使用参数:")
    print(f"  数据集路径: {args.data}")
    print(f"  模型路径: {args.checkpoint}")
    print(f"  目标疾病ID: {args.disease_id}")
    print(f"  相似疾病数量: {args.top_n}")
    
    # 检查必要文件是否存在
    required_files = [
        os.path.join(args.data, "dis2id.txt"),
        os.path.join(args.data, "gene2id.txt"),
        os.path.join(args.data, "miRNA2id.txt"),
        os.path.join(args.data, "d2g.npz"),
        os.path.join(args.data, "miRNA2disease.npz"),
        os.path.join(args.data, "gene2miRNA.npz")
    ]
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"必要文件不存在: {file_path}")
            
    print("所有必要文件已找到，开始处理...")

    device = torch.device("cuda" if not args.disable_cuda and torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load mappings
    dis_name_to_idx, idx_to_dis_name = load_disease_mapping(args.data)
    gene_mapping = load_entity_mapping(os.path.join(args.data, "gene2id.txt"), "gene")
    miRNA_mapping = load_entity_mapping(os.path.join(args.data, "miRNA2id.txt"), "miRNA")

    if args.disease_id not in dis_name_to_idx:
        print(f"Error: Disease ID {args.disease_id} not found, please check input or update mapping file")
        return

    print("Loading data...")
    hnadj = load_sparse(args.data + "/hnet.npz")
    src, dst = hnadj.row, hnadj.col
    hn_edge_weight = torch.tensor(np.hstack((hnadj.data, hnadj.data)), dtype=torch.float)
    hn_edge_weight = (hn_edge_weight - hn_edge_weight.min()) / (hn_edge_weight.max() - hn_edge_weight.min())
    hn_edge_index = torch.tensor(np.vstack((np.concatenate([src, dst]), np.concatenate([dst, src]))), dtype=torch.long)
    d2g = mx_to_torch_sparse_tensor(load_sparse(args.data + "/d2g.npz"))
    x = generate_sparse_one_hot(d2g.shape[1])
    g_data = Data(x=x, edge_index=hn_edge_index, edge_weight=hn_edge_weight).to(device)

    mnadj = load_sparse(args.data + "/miRNA2miRNA.npz")
    src, dst = mnadj.row, mnadj.col
    mn_edge_weight = torch.tensor(np.hstack((mnadj.data, mnadj.data)), dtype=torch.float)
    mn_edge_weight = (mn_edge_weight - mn_edge_weight.min()) / (mn_edge_weight.max() - mn_edge_weight.min())
    mn_edge_index = torch.tensor(np.vstack((np.concatenate([src, dst]), np.concatenate([dst, src]))), dtype=torch.long)
    x_m = generate_sparse_one_hot(mnadj.shape[0])
    m_data = Data(x=x_m, edge_index=mn_edge_index, edge_weight=mn_edge_weight).to(device)

    m2d_raw = mx_to_torch_sparse_tensor(load_sparse(args.data + "/miRNA2disease.npz"))
    m2d = m2d_raw.transpose(0, 1)

    print(f"Data dimensions - d2g: {d2g.shape}, m2d: {m2d.shape}, m2d_raw: {m2d_raw.shape}, Max disease index: {max(dis_name_to_idx.values())}")

    print("Initializing model...")
    g_encoder = GCN(nfeat=g_data.x.shape[1], nhid=args.h_dim).to(device)
    m_encoder = GATv2(nfeat=m_data.x.shape[1], nhid=args.h_dim).to(device)
    tower_in_dim = 4 * args.h_dim
    gene_tower = BilinearTower(in_dim=tower_in_dim, h_dim=args.h_dim, dropout=0.2).to(device)
    miRNA_tower = BilinearTower(in_dim=tower_in_dim, h_dim=args.h_dim, dropout=0.2).to(device)
    model = RGMI(g_encoder=g_encoder, m_encoder=m_encoder, gene_tower=gene_tower, miRNA_tower=miRNA_tower, h_dim=args.h_dim).to(device)

    print(f"Loading model weights from {args.checkpoint}...")
    if os.path.isfile(args.checkpoint):
        checkpoint = torch.load(args.checkpoint, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
        print("Model weights loaded successfully")
    else:
        print(f"Error: Checkpoint file {args.checkpoint} not found")
        return

    print("Performing inference...")
    model.eval()
    with torch.no_grad():
        g_h, m_h, d_h_gene, d_h_miRNA = model(g_data, m_data, d2g.to(device), m2d.to(device))

        print(f"Finding similar diseases for {args.disease_id}...")
        similar_diseases = find_similar_diseases(args.disease_id, d_h_gene, d_h_miRNA, dis_name_to_idx, idx_to_dis_name, args.top_n)

        if not similar_diseases:
            print("No similar diseases found")
            return

        print(f"\nTop {args.top_n} diseases similar to {args.disease_id}:")
        for idx, score, dis_id in similar_diseases:
            print(f"Index: {idx}, Disease ID: {dis_id}, Similarity: {score:.4f}")

        all_disease_ids = [args.disease_id] + [dis_id for _, _, dis_id in similar_diseases]
        print("\nFetching disease details from NCBI MedGen API...")

        disease_info_list = []
        target_info = fetch_disease_info(args.disease_id)
        target_idx = dis_name_to_idx[args.disease_id]
        target_genes, target_miRNAs = get_associated_entities(target_idx, d2g, m2d_raw, gene_mapping, miRNA_mapping)
        target_attributes = target_info.get("attributes", {})
        target_attributes["associated_gene_names"] = target_genes
        target_attributes["associated_miRNA_names"] = target_miRNAs
        disease_info_list.append({
            "disease_id": args.disease_id,
            "name": target_info.get("name", ""),
            "definition": target_info.get("definition", ""),
            "similarity": -1.0,
            "attributes": target_attributes
        })

        for _, score, dis_id in tqdm(similar_diseases, desc="Fetching disease info"):
            info = fetch_disease_info(dis_id)
            dis_idx = dis_name_to_idx.get(dis_id, -1)
            if dis_idx != -1:
                genes, miRNAs = get_associated_entities(dis_idx, d2g, m2d_raw, gene_mapping, miRNA_mapping)
                attributes = info.get("attributes", {})
                attributes["associated_gene_names"] = genes
                attributes["associated_miRNA_names"] = miRNAs
            else:
                attributes = info.get("attributes", {})
                attributes["associated_gene_names"] = []
                attributes["associated_miRNA_names"] = []
            disease_info_list.append({
                "disease_id": dis_id,
                "name": info.get("name", ""),
                "definition": info.get("definition", ""),
                "similarity": float(score),
                "attributes": attributes
            })
            time.sleep(0.5)

        # 在函数末尾修改，添加结果返回功能
        if return_results:
            # 返回疾病相似性结果，而不是保存到文件
            return disease_info_list
        else:
            print(f"\nSaving results to {args.output}...")
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(disease_info_list, f, ensure_ascii=False, indent=4)
            print(f"Results saved to {args.output}")