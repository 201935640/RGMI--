#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
优化版Entrez ID转换工具：将Entrez ID批量转换为基因符号，支持断点续传和本地数据库
"""

import os
import sys
import json
import time
import sqlite3
import requests
import argparse
import csv
import threading
import pickle
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm
import logging
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger('entrez-converter')

# 添加项目根目录到系统路径
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_path)

# 数据集路径
dataset_path = os.path.join(root_path, 'Dataset')

# 保存目录
saves_dir = os.path.join(os.path.dirname(__file__), 'saves')
if not os.path.exists(saves_dir):
    os.makedirs(saves_dir)

# 缓存目录
cache_dir = os.path.join(saves_dir, 'gene_cache')
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)

# 本地数据库文件
db_path = os.path.join(cache_dir, 'gene_database.db')

# NCBI API配置
NCBI_API_KEY = os.environ.get('NCBI_API_KEY', '')
NCBI_TOOL = 'entrez_converter'
NCBI_EMAIL = 'your_email@example.com'  # 建议用户替换为自己的邮箱

# 每次请求的批量大小
BATCH_SIZE = 50
THREAD_COUNT = 10
RETRY_LIMIT = 3
RETRY_DELAY = 2  # 秒
REQUEST_DELAY = 0.5  # 秒

# 命令行参数解析
def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='批量将Entrez ID转换为基因符号')
    parser.add_argument('--rebuild', action='store_true', help='重建本地数据库')
    parser.add_argument('--update', action='store_true', help='更新已有数据')
    parser.add_argument('--threads', type=int, default=THREAD_COUNT, help='线程数量')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE, help='批处理大小')
    parser.add_argument('--limit', type=int, default=0, help='限制处理的ID数量 (0表示不限制)')
    parser.add_argument('--offset', type=int, default=0, help='起始偏移量')
    parser.add_argument('--use-local', action='store_true', help='优先使用本地资源')
    parser.add_argument('--output', default='ID2Gene.txt', help='输出文件名')
    parser.add_argument('--update-jsons', action='store_true', help='更新疾病JSON文件中的基因符号')
    return parser.parse_args()

def create_database():
    """创建或初始化本地SQLite数据库"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 创建基因表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS genes (
        entrez_id TEXT PRIMARY KEY,
        symbol TEXT,
        description TEXT,
        source TEXT,
        last_updated TEXT,
        status TEXT
    )
    ''')
    
    # 创建进度表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY,
        total_ids INTEGER,
        processed_ids INTEGER,
        last_position INTEGER,
        last_updated TEXT
    )
    ''')
    
    conn.commit()
    conn.close()
    
    logger.info(f"本地数据库已初始化: {db_path}")

def get_progress():
    """获取当前处理进度"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT total_ids, processed_ids, last_position FROM progress WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {"total": row[0], "processed": row[1], "position": row[2]}
    else:
        return {"total": 0, "processed": 0, "position": 0}

def update_progress(total_ids, processed_ids, last_position):
    """更新处理进度"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute("SELECT id FROM progress WHERE id = 1")
    if cursor.fetchone():
        cursor.execute(
            "UPDATE progress SET total_ids = ?, processed_ids = ?, last_position = ?, last_updated = ? WHERE id = 1",
            (total_ids, processed_ids, last_position, now)
        )
    else:
        cursor.execute(
            "INSERT INTO progress (id, total_ids, processed_ids, last_position, last_updated) VALUES (1, ?, ?, ?, ?)",
            (total_ids, processed_ids, last_position, now)
        )
    
    conn.commit()
    conn.close()

def save_gene_to_db(entrez_id, symbol, description, source='ncbi'):
    """将基因信息保存到数据库"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute(
            "INSERT OR REPLACE INTO genes (entrez_id, symbol, description, source, last_updated, status) VALUES (?, ?, ?, ?, ?, ?)",
            (entrez_id, symbol, description, source, now, 'complete')
        )
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"保存基因 {entrez_id} 到数据库时出错: {e}")
        return False

def get_gene_from_db(entrez_id):
    """从数据库获取基因信息"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT symbol, description, source FROM genes WHERE entrez_id = ?", (entrez_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return {
                'symbol': row[0],
                'description': row[1],
                'source': row[2]
            }
        else:
            return None
    except Exception as e:
        logger.error(f"从数据库获取基因 {entrez_id} 时出错: {e}")
        return None

def get_genes_batch_from_db(entrez_ids):
    """从数据库批量获取基因信息"""
    result = {}
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 构建查询参数
        placeholders = ','.join(['?' for _ in entrez_ids])
        query = f"SELECT entrez_id, symbol, description FROM genes WHERE entrez_id IN ({placeholders})"
        
        cursor.execute(query, entrez_ids)
        rows = cursor.fetchall()
        
        conn.close()
        
        for row in rows:
            entrez_id, symbol, description = row
            result[entrez_id] = {
                'symbol': symbol,
                'description': description
            }
        
        return result
    except Exception as e:
        logger.error(f"从数据库批量获取基因信息时出错: {e}")
        return result

def fetch_gene_info_from_ncbi(entrez_id_batch):
    """从NCBI获取基因信息"""
    results = {}
    
    if not entrez_id_batch:
        return results
    
    id_string = ",".join(entrez_id_batch)
    api_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    
    params = {
        'db': 'gene',
        'id': id_string,
        'retmode': 'json',
        'tool': NCBI_TOOL,
        'email': NCBI_EMAIL
    }
    
    if NCBI_API_KEY:
        params['api_key'] = NCBI_API_KEY
    
    for retry in range(RETRY_LIMIT):
        try:
            response = requests.get(api_url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'result' in data:
                    for entrez_id in entrez_id_batch:
                        if entrez_id in data['result']:
                            gene_info = data['result'][entrez_id]
                            symbol = gene_info.get('symbol', '')
                            description = gene_info.get('description', '')
                            
                            # 保存到数据库
                            save_gene_to_db(entrez_id, symbol, description, 'ncbi')
                            
                            results[entrez_id] = {
                                'symbol': symbol,
                                'description': description
                            }
                        else:
                            # 对于找不到的ID，也记录到数据库，避免重复查询
                            save_gene_to_db(entrez_id, f"Unknown_{entrez_id}", "", 'ncbi')
                            results[entrez_id] = {
                                'symbol': f"Unknown_{entrez_id}",
                                'description': ""
                            }
                break  # 成功获取数据，退出重试循环
            
            elif response.status_code == 429:  # 请求过多
                wait_time = (retry + 1) * RETRY_DELAY
                logger.warning(f"NCBI API请求过多，等待{wait_time}秒后重试...")
                time.sleep(wait_time)
            else:
                logger.warning(f"NCBI API请求失败: HTTP {response.status_code}")
                time.sleep(RETRY_DELAY)
        
        except Exception as e:
            logger.error(f"请求NCBI API时出错 (重试 {retry+1}/{RETRY_LIMIT}): {e}")
            time.sleep(RETRY_DELAY)
    
    # 确保所有ID都有结果，即使是空结果
    for entrez_id in entrez_id_batch:
        if entrez_id not in results:
            save_gene_to_db(entrez_id, f"Failed_{entrez_id}", "", 'error')
            results[entrez_id] = {
                'symbol': f"Failed_{entrez_id}",
                'description': ""
            }
    
    return results

def worker_function(entrez_ids, result_dict, lock, pbar):
    """工作线程函数，处理一批Entrez ID"""
    try:
        # 首先检查数据库中是否已有这些ID
        db_results = get_genes_batch_from_db(entrez_ids)
        missing_ids = [id for id in entrez_ids if id not in db_results]
        
        # 更新进度条和结果
        with lock:
            pbar.update(len(entrez_ids) - len(missing_ids))
            result_dict.update(db_results)
        
        # 如果有缺失的ID，从NCBI获取
        if missing_ids:
            api_results = fetch_gene_info_from_ncbi(missing_ids)
            
            # 更新进度条和结果
            with lock:
                pbar.update(len(missing_ids))
                result_dict.update(api_results)
        
        # 避免请求过于频繁
        time.sleep(REQUEST_DELAY)
    
    except Exception as e:
        logger.error(f"工作线程处理时出错: {e}")

def read_gene2id_file():
    """读取gene2id.txt文件，获取所有基因ID"""
    gene_ids = []
    gene2id_path = os.path.join(dataset_path, 'gene2id.txt')
    
    if not os.path.exists(gene2id_path):
        logger.error(f"基因ID文件不存在: {gene2id_path}")
        return []
    
    try:
        with open(gene2id_path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 1:
                    gene_ids.append(parts[0])
        
        logger.info(f"从gene2id.txt文件中读取了 {len(gene_ids)} 个基因ID")
        return gene_ids
    except Exception as e:
        logger.error(f"读取gene2id.txt文件时出错: {e}")
        return []

def process_entrez_ids(entrez_ids, args):
    """处理一批Entrez ID，获取基因符号"""
    # 创建结果字典和互斥锁
    result_dict = {}
    lock = threading.Lock()
    
    # 如果设置了limit，则限制ID数量
    if args.limit > 0 and args.limit < len(entrez_ids):
        logger.info(f"限制处理ID数量为 {args.limit} 个")
        entrez_ids = entrez_ids[args.offset:args.offset + args.limit]
    elif args.offset > 0:
        logger.info(f"从偏移量 {args.offset} 开始处理")
        entrez_ids = entrez_ids[args.offset:]
    
    total_ids = len(entrez_ids)
    logger.info(f"准备处理 {total_ids} 个Entrez ID")
    
    # 更新进度信息
    update_progress(total_ids, 0, args.offset)
    
    # 分批处理
    batch_size = args.batch_size
    thread_count = min(args.threads, (total_ids + batch_size - 1) // batch_size)
    logger.info(f"使用 {thread_count} 个线程，每批 {batch_size} 个ID")
    
    # 创建进度条
    with tqdm(total=total_ids, desc="处理基因ID") as pbar:
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            
            # 提交任务
            for i in range(0, total_ids, batch_size):
                batch = entrez_ids[i:i+batch_size]
                future = executor.submit(worker_function, batch, result_dict, lock, pbar)
                futures.append(future)
                
                # 定期更新进度
                if i % (batch_size * 10) == 0 and i > 0:
                    processed = min(i, total_ids)
                    update_progress(total_ids, processed, args.offset + processed)
            
            # 等待所有任务完成
            for future in futures:
                future.result()
    
    # 最终更新进度
    update_progress(total_ids, total_ids, args.offset + total_ids)
    
    return result_dict

def save_results_to_file(gene_info, output_path):
    """将结果保存到文件"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            # 写入标题行
            f.write("Entrez_ID\tGene_Symbol\tDescription\n")
            
            # 按Entrez ID排序
            sorted_ids = sorted(gene_info.keys())
            
            # 写入数据行
            for entrez_id in sorted_ids:
                info = gene_info[entrez_id]
                symbol = info.get('symbol', f"Unknown_{entrez_id}")
                description = info.get('description', "")
                f.write(f"{entrez_id}\t{symbol}\t{description}\n")
        
        logger.info(f"成功保存 {len(gene_info)} 个基因映射到 {output_path}")
        return True
    except Exception as e:
        logger.error(f"保存结果到文件时出错: {e}")
        return False

def update_disease_files(gene_mappings):
    """更新疾病文件中的基因符号"""
    # 检查saves目录下的所有json文件
    disease_files = [f for f in os.listdir(saves_dir) if f.endswith('.json') and f != 'total_diseases_info.json']
    updated_files = 0
    
    for disease_file in tqdm(disease_files, desc="更新疾病文件"):
        file_path = os.path.join(saves_dir, disease_file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                disease_data = json.load(f)
            
            # 判断是单个疾病对象还是疾病列表
            if isinstance(disease_data, list):
                diseases = disease_data
            else:
                diseases = [disease_data]
            
            # 标记是否有更新
            updated = False
            
            # 更新每个疾病对象
            for disease in diseases:
                if 'attributes' in disease and 'associated_gene_names' in disease['attributes']:
                    gene_ids = disease['attributes']['associated_gene_names']
                    # 添加基因符号
                    gene_symbols = []
                    
                    for gene_id in gene_ids:
                        if gene_id in gene_mappings:
                            symbol = gene_mappings[gene_id].get('symbol', '')
                            if symbol and not symbol.startswith(("Unknown_", "Failed_")):
                                gene_symbols.append(symbol)
                    
                    # 添加基因符号到疾病对象
                    if gene_symbols:
                        disease['attributes']['gene_symbols'] = gene_symbols
                        updated = True
            
            # 如果有更新，保存回文件
            if updated:
                with open(file_path, 'w', encoding='utf-8') as f:
                    if isinstance(disease_data, list):
                        json.dump(diseases, f, ensure_ascii=False, indent=2)
                    else:
                        json.dump(diseases[0], f, ensure_ascii=False, indent=2)
                updated_files += 1
                
        except Exception as e:
            logger.error(f"更新疾病文件 {disease_file} 时出错: {e}")
    
    # 更新total_diseases_info.json（如果存在）
    total_file = os.path.join(saves_dir, 'total_diseases_info.json')
    if os.path.exists(total_file):
        try:
            with open(total_file, 'r', encoding='utf-8') as f:
                all_diseases = json.load(f)
            
            updated = False
            for disease in all_diseases:
                if 'attributes' in disease and 'associated_gene_names' in disease['attributes']:
                    gene_ids = disease['attributes']['associated_gene_names']
                    # 添加基因符号
                    gene_symbols = []
                    
                    for gene_id in gene_ids:
                        if gene_id in gene_mappings:
                            symbol = gene_mappings[gene_id].get('symbol', '')
                            if symbol and not symbol.startswith(("Unknown_", "Failed_")):
                                gene_symbols.append(symbol)
                    
                    # 添加基因符号到疾病对象
                    if gene_symbols:
                        disease['attributes']['gene_symbols'] = gene_symbols
                        updated = True
            
            # 如果有更新，保存回文件
            if updated:
                with open(total_file, 'w', encoding='utf-8') as f:
                    json.dump(all_diseases, f, ensure_ascii=False, indent=2)
                updated_files += 1
                
        except Exception as e:
            logger.error(f"更新总疾病信息文件时出错: {e}")
    
    logger.info(f"成功更新 {updated_files} 个疾病文件中的基因符号")
    return updated_files

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_arguments()
    
    logger.info("开始将Entrez ID转换为基因符号...")
    
    # 确保数据库存在
    if not os.path.exists(db_path) or args.rebuild:
        create_database()
    
    # 读取所有基因ID
    entrez_ids = read_gene2id_file()
    
    if not entrez_ids:
        logger.error("没有找到任何基因ID，无法继续")
        sys.exit(1)
    
    # 处理基因ID
    gene_info = process_entrez_ids(entrez_ids, args)
    
    # 保存结果到文件
    output_path = os.path.join(saves_dir, args.output)
    save_results_to_file(gene_info, output_path)
    
    # 如果需要，更新疾病文件
    if args.update_jsons:
        update_disease_files(gene_info)
    
    logger.info("处理完成！")

if __name__ == "__main__":
    main() 