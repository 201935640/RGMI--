import numpy as np
import torch
import os
from tqdm import tqdm

def preprocess_data(dataset_path):
    print(f"Loading dataset from {dataset_path}...")
    
    # 1. Load ID mappings and verify counts
    gene2id = {}
    with open(os.path.join(dataset_path, 'gene2id.txt'), 'r') as f:
        lines = f.readlines()
        num_genes_expected = int(lines[0].strip())
        for line in lines[1:]:
            parts = line.strip().split()
            if len(parts) == 2:
                gene2id[parts[0]] = int(parts[1])
    
    dis2id = {}
    with open(os.path.join(dataset_path, 'dis2id.txt'), 'r') as f:
        lines = f.readlines()
        num_dis_expected = int(lines[0].strip())
        for line in lines[1:]:
            parts = line.strip().split()
            if len(parts) == 2:
                dis2id[parts[0]] = int(parts[1])
                
    print(f"Loaded {len(gene2id)}/{num_genes_expected} genes and {len(dis2id)}/{num_dis_expected} diseases.")

    # 2. Extract and clean Gene-Gene Interactions (GGI) - From hnet.npz
    print("Extracting Gene-Gene Interactions (GGI) from hnet.npz...")
    hnet_data = np.load(os.path.join(dataset_path, 'hnet.npz'))
    ggi_rows = hnet_data['row']
    ggi_cols = hnet_data['col']
    
    # Validate indices
    assert ggi_rows.max() < len(gene2id), "Gene index out of bounds in GGI rows"
    assert ggi_cols.max() < len(gene2id), "Gene index out of bounds in GGI cols"
    
    ggi_edge_index = torch.tensor([ggi_rows, ggi_cols], dtype=torch.long)
    
    # 3. Extract and clean Disease-Gene Interactions (DGI) - From d2g.npz
    print("Extracting Disease-Gene Interactions (DGI) from d2g.npz...")
    d2g_data = np.load(os.path.join(dataset_path, 'd2g.npz'))
    d2g_rows = d2g_data['row'] # Diseases
    d2g_cols = d2g_data['col'] # Genes
    
    # Validate indices
    assert d2g_rows.max() < len(dis2id), "Disease index out of bounds in DGI"
    assert d2g_cols.max() < len(gene2id), "Gene index out of bounds in DGI"
    
    dgi_edge_index = torch.tensor([d2g_rows, d2g_cols], dtype=torch.long)

    # 4. Save processed data for VGAE (Day 2) and Fusion (Day 5)
    output_dir = os.path.join(dataset_path, 'processed')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    torch.save(ggi_edge_index, os.path.join(output_dir, 'ggi_edge_index.pt'))
    torch.save(dgi_edge_index, os.path.join(output_dir, 'dgi_edge_index.pt'))
    
    print(f"Saved processed data to {output_dir}")
    print(f"GGI Edges: {ggi_edge_index.shape[1]}")
    print(f"DGI Edges: {dgi_edge_index.shape[1]}")
    
    # 5. Summary of node types and counts
    num_nodes = len(gene2id) + len(dis2id)
    print(f"Total Unique Nodes: {num_nodes}")
    print(f"Gene Nodes: {len(gene2id)} (Indices: 0 to {len(gene2id)-1})")
    print(f"Disease Nodes: {len(dis2id)} (Indices: 0 to {len(dis2id)-1})")
    
    return ggi_edge_index, dgi_edge_index

if __name__ == "__main__":
    dataset_dir = r'c:\Users\D\Desktop\RGMI\project_01\model\RGMI_pretrain\Dataset'
    preprocess_data(dataset_dir)
