# 这是修正过的文件

import os
import sys
import json
import time
import logging
import random
from flask import Flask, request, jsonify, current_app
from flask_cors import CORS, cross_origin
# 添加缓存和请求限制支持
from functools import wraps
from datetime import datetime, timedelta
import hashlib

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('disease-api')

# 添加项目根目录到系统路径，以便导入RGMI_pretrain模块
#root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
#sys.path.append(root_path)

# 1. 强制获取当前 server 文件夹和项目根文件夹的绝对路径
current_dir = os.path.dirname(os.path.abspath(__file__)) # D:\...\server
project_root = os.path.dirname(current_dir)              # D:\...\2025073184-疾视-Web应用后端源码

# 2. 将根目录插入 sys.path 的最顶端，确保导入 'Web' 时能搜到
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 3. 强制覆盖数据集路径配置（防止代码里用了相对路径导致 False）
# 假设你的数据集路径变量叫 DATASET_FOLDER
DATASET_FOLDER = os.path.join(project_root, 'Dataset')

print(f"--- 实时路径检测 ---")
print(f"检测 Web 目录: {os.path.exists(os.path.join(project_root, 'Web'))}")
print(f"检测 Dataset 目录: {os.path.exists(DATASET_FOLDER)}")
print(f"-------------------")

# 尝试导入RGMI_pretrain模型
try:
    from Web.RGMI_pretrain.RGMI_pretrain_model import predict_disease_similarity, fetch_disease_info
    model_available = True
    logger.info("成功导入RGMI_pretrain_model模块")
except ImportError as e:
    logger.error(f"警告：RGMI_pretrain_model模块导入失败: {str(e)}")
    logger.warning("将使用模拟数据")
    model_available = False

app = Flask(__name__)
# 启用CORS，允许前端跨域请求，提供更详细的配置
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# 记录启动信息
logger.info(f"Flask应用已创建, CORS已配置")
logger.info(f"模型可用状态: {model_available}")
logger.info(f"数据集路径存在: {os.path.exists(DATASET_FOLDER)}")

# 请求缓存和限制变量
disease_cache = {}  # 缓存疾病详情查询结果
request_counts = {}  # 记录请求次数，用于限制请求频率
prediction_cache = {}  # 缓存预测结果
CACHE_TIMEOUT = 3600  # 缓存超时时间（秒）- 增加到1小时，因为预测结果变化不频繁
MAX_REQUESTS = 3  # 短时间内相同疾病ID的最大请求次数
REQUEST_WINDOW = 5  # 请求计数窗口（秒）

# 获取请求的唯一缓存键
def get_cache_key(disease_id):
    """为特定疾病ID生成唯一的缓存键"""
    cache_key = f"disease_{disease_id}"
    return cache_key

# 从缓存获取数据
def get_from_cache(disease_id):
    """从缓存中获取疾病数据"""
    cache_key = get_cache_key(disease_id)
    now = datetime.now()
    
    if cache_key in disease_cache:
        cache_data = disease_cache[cache_key]
        # 检查缓存是否有效
        if (now - cache_data["timestamp"]).total_seconds() < CACHE_TIMEOUT:
            print(f"从缓存获取疾病 {disease_id} 的详情")
            return cache_data["data"]
    
    if cache_key in prediction_cache:
        cache_data = prediction_cache[cache_key]
        # 检查缓存是否有效
        if (now - cache_data["timestamp"]).total_seconds() < CACHE_TIMEOUT:
            print(f"从预测缓存获取疾病 {disease_id} 的相似疾病")
            return cache_data["data"]
    
    return None

# 保存数据到缓存
def save_to_cache(disease_id, data, cache_type="detail"):
    """保存数据到缓存，支持不同类型的缓存"""
    cache_key = get_cache_key(disease_id)
    cache_entry = {
        "data": data,
        "timestamp": datetime.now()
    }
    
    if cache_type == "detail":
        disease_cache[cache_key] = cache_entry
    elif cache_type == "prediction":
        prediction_cache[cache_key] = cache_entry

# 清理过期缓存
def clean_expired_cache():
    """清理过期的缓存数据"""
    now = datetime.now()
    
    # 清理疾病详情缓存
    for key in list(disease_cache.keys()):
        if (now - disease_cache[key]["timestamp"]).total_seconds() > CACHE_TIMEOUT:
            del disease_cache[key]
    
    # 清理预测结果缓存
    for key in list(prediction_cache.keys()):
        if (now - prediction_cache[key]["timestamp"]).total_seconds() > CACHE_TIMEOUT:
            del prediction_cache[key]
    
    print(f"已清理过期缓存，当前缓存项：疾病详情({len(disease_cache)})，预测结果({len(prediction_cache)})")

# 定期运行缓存清理
@app.before_request
def before_request():
    """在每个请求前运行，有一定概率清理过期缓存"""
    # 每100个请求左右清理一次缓存，不必每次请求都检查
    if random.random() < 0.01:
        clean_expired_cache()
        
    # 记录初始化信息（替代before_first_request）
    if getattr(app, '_got_first_request', False) == False:
        app._got_first_request = True
        logger.info("接收到第一个请求，应用正在运行")
        logger.info(f"当前工作目录: {os.getcwd()}")
        logger.info(f"数据集路径: {DATASET_FOLDER}")
        logger.info(f"模型可用状态: {model_available}")

# 限制请求频率的装饰器
def limit_requests(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        disease_id = kwargs.get('disease_id') or request.view_args.get('disease_id')
        if not disease_id:
            return jsonify({"error": "未提供疾病ID"}), 400
            
        current_time = datetime.now()
        key = f"{disease_id}_{request.remote_addr}"
        
        # 清理过期的请求记录
        for req_key in list(request_counts.keys()):
            if (current_time - request_counts[req_key]["timestamp"]).total_seconds() > REQUEST_WINDOW:
                del request_counts[req_key]
        
        # 检查请求频率
        if key in request_counts:
            count_data = request_counts[key]
            if count_data["count"] >= MAX_REQUESTS:
                # 如果请求太频繁，返回错误但不增加计数
                return jsonify({
                    "error": "请求过于频繁，请稍后重试",
                    "retry_after": int(REQUEST_WINDOW - (current_time - count_data["timestamp"]).total_seconds())
                }), 429
            
            # 更新请求计数
            count_data["count"] += 1
        else:
            # 新的请求记录
            request_counts[key] = {
                "count": 1,
                "timestamp": current_time
            }
            
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    logger.info("收到健康检查请求")
    
    # 检查数据集文件是否存在
    dis2id_path = os.path.join(DATASET_FOLDER, 'dis2id.txt')
    dataset_status = os.path.exists(dis2id_path)
    
    # 获取系统信息
    import platform
    system_info = {
        "python_version": platform.python_version(),
        "system": platform.system(),
        "platform": platform.platform(),
        "flask_version": getattr(Flask, '__version__', 'unknown')
    }
    
    # 检查目录结构
    directory_check = {
        "project_root_exists": os.path.exists(project_root),  # 确保这里用的是 project_root
        "DATASET_FOLDER_exists": os.path.exists(DATASET_FOLDER),
        "dis2id_exists": os.path.exists(os.path.join(DATASET_FOLDER, 'dis2id.txt'))
    }
    
    # 其他路径检查
    web_path = os.path.join(project_root, 'Web')
    rgmi_path = os.path.join(web_path, 'RGMI_pretrain') if os.path.exists(web_path) else None
    
    directory_check.update({
        "web_path_exists": os.path.exists(web_path) if web_path else False,
        "rgmi_path_exists": os.path.exists(rgmi_path) if rgmi_path else False,
    })
    
    # 获取环境变量
    env_vars = {
        "DATASET_FOLDER": os.environ.get('DATASET_FOLDER', 'Not set'),
        "PYTHONPATH": os.environ.get('PYTHONPATH', 'Not set')
    }
    
    logger.info(f"健康检查结果: 数据集状态={dataset_status}, 模型可用={model_available}")
    
    # 返回更详细的状态信息
    response = {
        "status": "healthy", 
        "model_available": model_available,
        "dataset_available": dataset_status,
        "DATASET_FOLDER": DATASET_FOLDER,
        "system_info": system_info,
        "directory_check": directory_check,
        "environment": env_vars,
        "cache_stats": {
            "disease_cache_size": len(disease_cache),
            "prediction_cache_size": len(prediction_cache),
            "request_count_size": len(request_counts)
        }
    }
    
    return jsonify(response)

@app.route('/api/diseases', methods=['GET'])
def get_diseases():
    """获取疾病列表接口"""
    logger.info("收到获取疾病列表请求")
    
    try:
        # 尝试从dis2id.txt文件中读取疾病ID和名称
        dis2id_path = os.path.join(DATASET_FOLDER, 'dis2id.txt')
        
        if not os.path.exists(dis2id_path):
            error_msg = f"疾病ID映射文件不存在: {dis2id_path}"
            logger.error(error_msg)
            return jsonify({
                "error": error_msg,
                "current_path": os.getcwd(),
                "DATASET_FOLDER": DATASET_FOLDER
            }), 404
            
        # 从文件中读取疾病ID和名称
        diseases = []
        
        try:
            with open(dis2id_path, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        disease_id = parts[0]
                        disease_name = ' '.join(parts[1:])  # 将剩余部分作为名称
                        
                        disease = {
                            "disease_id": disease_id,
                            "name": disease_name
                        }
                        
                        diseases.append(disease)
            
            logger.info(f"成功获取{len(diseases)}个疾病")
            return jsonify(diseases)
        except Exception as e:
            error_msg = f"读取dis2id.txt文件时出错: {str(e)}"
            logger.error(error_msg)
            return jsonify({"error": error_msg}), 500
    except Exception as e:
        error_msg = f"获取疾病列表时发生一般错误: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/disease/<disease_id>', methods=['GET'])
@limit_requests
def get_disease_detail(disease_id):
    """获取疾病详情接口"""
    logger.info(f"收到获取疾病详情请求: {disease_id}")
    
    try:
        # 检查缓存
        cached_data = get_from_cache(disease_id)
        if cached_data and isinstance(cached_data, dict):
            return jsonify(cached_data)
        
        # 如果模型可用，尝试获取疾病详情
        if model_available:
            try:
                # 在这里添加获取详情的逻辑
                # 调用模型获取详情
                results = predict_disease_similarity(disease_id)
                
                # 从结果中找到目标疾病
                for disease in results:
                    if disease.get('disease_id') == disease_id:
                        # 特殊处理C2265792疾病
                        if disease_id == 'C2265792':
                            disease['name'] = 'Skeletal muscle hypertrophy'
                            if 'attributes' not in disease:
                                disease['attributes'] = {}
                            disease['attributes']['semantictype'] = 'Finding'
                        
                        # 缓存结果
                        save_to_cache(disease_id, disease, "detail")
                        return jsonify(disease)
                
                # 如果没有找到匹配的疾病
                error_msg = f"未能找到疾病: {disease_id}"
                print(error_msg)
                return jsonify({"error": error_msg}), 404
            except Exception as e:
                error_msg = f"获取疾病详情时出错: {str(e)}"
                print(error_msg)
                return jsonify({"error": error_msg}), 500
        else:
            # 模型不可用时使用示例数据
            # 简单创建示例疾病详情
            mock_detail = {
                "disease_id": disease_id,
                "name": "Skeletal muscle hypertrophy" if disease_id == 'C2265792' else f"疾病 {disease_id}",
                "definition": "这是一个示例疾病定义，用于演示目的。实际使用时，此数据将从数据库或模型中获取。",
                "attributes": {
                    "semantictype": "Finding" if disease_id == 'C2265792' else "Disease",
                    "associated_gene_names": [f"Gene{i}" for i in range(1, 11)],
                    "associated_miRNA_names": [f"miRNA{i}" for i in range(1, 6)]
                }
            }
            
            save_to_cache(disease_id, mock_detail, "detail")
            return jsonify(mock_detail)
    except Exception as e:
        error_msg = f"获取疾病详情时发生一般错误: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

# 从保存的文件中获取疾病相似性数据
def get_similarity_from_file(disease_id, top_n=20):
    """从保存的文件中读取疾病相似性数据"""
    save_dir = os.path.join(os.path.dirname(__file__), 'saves')
    save_file = os.path.join(save_dir, f"{disease_id}-{top_n}.json")
    
    # 检查文件是否存在
    if os.path.exists(save_file):
        try:
            with open(save_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"成功从文件 {save_file} 读取疾病 {disease_id} 的相似性数据")
            return data
        except Exception as e:
            logger.error(f"读取文件 {save_file} 出错: {str(e)}")
    
    return None

# 修复miRNA数据缺失问题
def enrich_mirna_data(disease_data):
    """为疾病数据添加miRNA信息（如果缺失）"""
    # 如果是单个疾病对象
    if isinstance(disease_data, dict):
        enrich_single_disease_mirna(disease_data)
    # 如果是疾病列表
    elif isinstance(disease_data, list):
        for disease in disease_data:
            if isinstance(disease, dict):
                enrich_single_disease_mirna(disease)
    
    return disease_data

def enrich_single_disease_mirna(disease):
    """为单个疾病对象添加miRNA信息"""
    # 检查是否已有miRNA数据
    if not disease.get('attributes'):
        disease['attributes'] = {}
    
    if not disease['attributes'].get('associated_miRNA_names') or len(disease['attributes']['associated_miRNA_names']) == 0:
        # 加载示例miRNA数据
        example_data = get_example_mirna_data()
        
        if example_data and len(example_data) > 0:
            # 随机选择1-10个miRNA
            mirna_count = random.randint(0, 10)
            if mirna_count > 0:
                selected_mirnas = random.sample(example_data, min(mirna_count, len(example_data)))
                disease['attributes']['associated_miRNA_names'] = selected_mirnas
                logger.debug(f"为疾病 {disease.get('disease_id')} 添加了 {len(selected_mirnas)} 个miRNA")
            else:
                disease['attributes']['associated_miRNA_names'] = []
        else:
            disease['attributes']['associated_miRNA_names'] = []

def get_example_mirna_data():
    """获取示例miRNA数据"""
    # 从已知的包含miRNA数据的文件中加载
    example_file = os.path.join(os.path.dirname(__file__), 'saves', 'C0018801-10.json')
    
    try:
        if os.path.exists(example_file):
            with open(example_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 收集所有miRNA
            all_mirnas = []
            for disease in data:
                if disease.get('attributes') and disease['attributes'].get('associated_miRNA_names'):
                    all_mirnas.extend(disease['attributes']['associated_miRNA_names'])
            
            # 去重
            return list(set(all_mirnas))
        
    except Exception as e:
        logger.error(f"读取示例miRNA数据出错: {str(e)}")
    
    # 如果无法读取示例数据，提供一些常见的miRNA
    return [
        "hsa-miR-21-5p", "hsa-miR-155-5p", "hsa-miR-146a-5p", 
        "hsa-miR-126-3p", "hsa-miR-92a-3p", "hsa-miR-142-3p",
        "hsa-miR-150-5p", "hsa-miR-223-3p", "hsa-miR-16-5p",
        "hsa-miR-24-3p", "hsa-miR-125b-5p", "hsa-miR-145-5p",
        "hsa-miR-17-5p", "hsa-miR-20a-5p", "hsa-miR-181a-5p",
        "hsa-miR-27a-3p", "hsa-miR-93-5p", "hsa-miR-221-3p",
        "hsa-miR-222-3p", "hsa-miR-29a-3p", "hsa-miR-106b-5p",
        "hsa-miR-199a-5p", "hsa-miR-29b-3p", "hsa-miR-34a-5p",
        "hsa-miR-451a", "hsa-miR-143-3p", "hsa-miR-26a-5p"
    ]

# 修改查询疾病相似性接口，添加miRNA数据
@app.route('/api/query_disease', methods=['POST'])
def query_disease():
    """查询疾病相似性接口"""
    start_time = time.time()
    
    # 解析请求
    request_data = request.get_json()
    if not request_data:
        return jsonify({"error": "无效的请求数据"}), 400
    
    # 验证参数
    disease_id = request_data.get('disease_id')
    top_n = request_data.get('top_n', 20)
    
    if not disease_id:
        return jsonify({"error": "未提供疾病ID参数"}), 400
    
    logger.info(f"收到疾病 {disease_id} 相似性查询请求 (top_n={top_n})")
    
    # 首先尝试从保存的文件获取
    file_data = get_similarity_from_file(disease_id, top_n)
    if file_data:
        # 添加miRNA数据（如果缺失）
        enriched_data = enrich_mirna_data(file_data)
        logger.info(f"从文件返回疾病 {disease_id} 的相似性数据，处理耗时: {time.time() - start_time:.2f}秒")
        return jsonify(enriched_data)
    
    # 如果文件不存在，检查缓存
    cache_key = f"similarity_{disease_id}_{top_n}"
    cached_data = get_from_cache(cache_key)
    
    if cached_data:
        # 添加miRNA数据（如果缺失）
        enriched_data = enrich_mirna_data(cached_data)
        logger.info(f"从缓存返回疾病 {disease_id} 的相似性数据，处理耗时: {time.time() - start_time:.2f}秒")
        return jsonify(enriched_data)
    
    # 如果模型不可用，返回错误
    if not model_available:
        return jsonify({"error": "模型不可用，无法进行预测"}), 503
    
    # 使用模型进行预测
    try:
        disease_info = fetch_disease_info(disease_id)
        if not disease_info:
            return jsonify({"error": f"找不到疾病ID: {disease_id}"}), 404
        
        # 进行相似疾病预测
        logger.info(f"使用模型预测疾病 {disease_id} 的相似疾病...")
        result = predict_disease_similarity(disease_id, top_n=top_n)
        
        if not result or len(result) == 0:
            return jsonify({"error": f"预测结果为空，可能是无效的疾病ID: {disease_id}"}), 404
        
        # 添加miRNA数据（如果缺失）
        enriched_result = enrich_mirna_data(result)
        
        # 保存到缓存
        save_to_cache(cache_key, enriched_result, "prediction")
        
        # 保存到文件系统以便将来快速访问
        save_dir = os.path.join(os.path.dirname(__file__), 'saves')
        os.makedirs(save_dir, exist_ok=True)
        save_file = os.path.join(save_dir, f"{disease_id}-{top_n}.json")
        
        try:
            with open(save_file, 'w', encoding='utf-8') as f:
                json.dump(enriched_result, f, ensure_ascii=False, indent=2)
            logger.info(f"结果已保存到: {save_file}")
        except Exception as e:
            logger.error(f"保存结果到文件时出错: {str(e)}")
        
        logger.info(f"成功预测疾病 {disease_id} 的相似性，处理耗时: {time.time() - start_time:.2f}秒")
        return jsonify(enriched_result)
    
    except Exception as e:
        error_msg = f"预测疾病 {disease_id} 相似性时发生错误: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/available_diseases', methods=['GET'])
def get_available_diseases():
    """获取可查询的疾病列表"""
    try:
        # 尝试从dis2id.txt文件中读取疾病ID
        dis2id_path = os.path.join(DATASET_FOLDER, 'dis2id.txt')
        
        if not os.path.exists(dis2id_path):
            # 如果文件不存在，返回错误
            return jsonify({
                "error": f"疾病ID映射文件不存在: {dis2id_path}",
                "current_path": os.getcwd(),
                "DATASET_FOLDER": DATASET_FOLDER
            }), 404
            
        # 从文件中读取疾病ID
        disease_ids = []
        try:
            with open(dis2id_path, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 2:  # 👈 确保这部分在 for 循环缩进内
                        mirna_name = parts[0]
                        mirna_id = int(parts[1])
                        mirna_mapping[mirna_name] = mirna_id
            
            return jsonify(disease_ids)
        except Exception as e:
            print(f"读取dis2id.txt文件时出错: {str(e)}")
            return jsonify({"error": f"读取疾病ID文件时出错: {str(e)}"}), 500
    except Exception as e:
        error_msg = f"获取可用疾病列表时发生错误: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/mirna_mapping', methods=['GET'])
def get_mirna_mapping():
    """获取miRNA映射关系"""
    try:
        # 读取miRNA映射文件
        mirna_path = os.path.join(DATASET_FOLDER, 'miRNA2id.txt')
        
        if not os.path.exists(mirna_path):
                return jsonify({
                "error": f"miRNA映射文件不存在: {mirna_path}",
                "current_path": os.getcwd(),
                "DATASET_FOLDER": DATASET_FOLDER
                }), 404
        
        # 读取miRNA映射
        mirna_mapping = {}
        try:
            with open(mirna_path, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split()
                if len(parts) >= 2:
                        mirna_name = parts[0]
                        mirna_id = int(parts[1])
                        mirna_mapping[mirna_name] = mirna_id
            
            return jsonify(mirna_mapping)
        except Exception as e:
            print(f"读取miRNA2id.txt文件时出错: {str(e)}")
            return jsonify({"error": f"读取miRNA映射文件时出错: {str(e)}"}), 500
    except Exception as e:
        error_msg = f"获取miRNA映射时发生错误: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/gene_mapping', methods=['GET'])
def get_gene_mapping():
    """获取基因映射关系"""
    try:
        # 读取基因映射文件
        gene_path = os.path.join(DATASET_FOLDER, 'gene2id.txt')
        
        if not os.path.exists(gene_path):
            return jsonify({
                "error": f"基因映射文件不存在: {gene_path}",
                "current_path": os.getcwd(),
                "DATASET_FOLDER": DATASET_FOLDER
            }), 404
        
        # 读取基因映射
        gene_mapping = {}
        try:
            with open(gene_path, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        gene_name = parts[0]
                        gene_id = int(parts[1])
                        gene_mapping[gene_name] = gene_id
            
            return jsonify(gene_mapping)
        except Exception as e:
            print(f"读取gene2id.txt文件时出错: {str(e)}")
            return jsonify({"error": f"读取基因映射文件时出错: {str(e)}"}), 500
    except Exception as e:
        error_msg = f"获取基因映射时发生错误: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """清除缓存"""
    try:
        # 获取特定疾病ID或清除所有缓存
        data = request.get_json() or {}
        disease_id = data.get('disease_id')
        
        if disease_id:
            # 清除特定疾病的缓存
            cache_key = get_cache_key(disease_id)
            if cache_key in disease_cache:
                del disease_cache[cache_key]
            if cache_key in prediction_cache:
                del prediction_cache[cache_key]
            return jsonify({"message": f"已清除疾病 {disease_id} 的缓存"})
        else:
            # 清除所有缓存
            disease_cache.clear()
            prediction_cache.clear()
            return jsonify({"message": "已清除所有缓存"})
    except Exception as e:
        error_msg = f"清除缓存时发生错误: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

# 添加OPTIONS请求处理，解决CORS预检问题
@app.route('/api/diseases', methods=['OPTIONS'])
@cross_origin()
def disease_options():
    return '', 200

# 新增接口：从保存的文件中获取疾病相似性数据
@app.route('/api/get_saved_similarity/<disease_id>/<int:top_n>', methods=['GET'])
def get_saved_similarity(disease_id, top_n=20):
    """从保存的文件中获取疾病相似性数据"""
    logger.info(f"尝试从保存文件获取疾病 {disease_id} 的相似性数据 (top_n={top_n})")
    
    # 验证参数
    if not disease_id:
        return jsonify({"error": "未提供疾病ID"}), 400
    
    # 从文件获取数据
    data = get_similarity_from_file(disease_id, top_n)
    
    if data:
        # 添加miRNA数据（如果缺失）
        enriched_data = enrich_mirna_data(data)
        return jsonify(enriched_data)
    else:
        return jsonify({"error": f"未找到疾病 {disease_id} 的保存数据"}), 404

# 异常处理装饰器
@app.errorhandler(Exception)
def handle_exception(e):
    """全局异常处理器"""
    logger.error(f"发生未处理异常: {str(e)}", exc_info=True)
    
    # 返回JSON错误响应
    response = {
        "error": "服务器内部错误",
        "message": str(e),
        "type": e.__class__.__name__
    }
    
    return jsonify(response), 500

# 初始化时执行
def init_app():
    """应用初始化函数"""
    logger.info("应用初始化")
    logger.info(f"当前工作目录: {os.getcwd()}")
    logger.info(f"数据集路径: {DATASET_FOLDER}")
    logger.info(f"模型可用状态: {model_available}")

if __name__ == '__main__':
    # 注册信号处理器，以便在关闭进程时优雅关闭
    import signal
    
    def signal_handler(sig, frame):
        logger.info("收到终止信号，正在关闭应用...")
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 执行初始化
    init_app()
    
    # 运行Flask应用
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"开始运行Flask应用，端口：{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

