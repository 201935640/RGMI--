#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
简化版基因ID转换工具 - 使用缓存和分批处理获取所有基因信息
"""

import os
import sys
import json
import time
import pickle
import requests
from tqdm import tqdm
import logging
import argparse

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger('gene-converter')

# 添加项目根目录到系统路径
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_path)

# 数据集路径
dataset_path = os.path.join(root_path, 'Dataset')
logger.info(f"数据集路径: {dataset_path}")

# 保存目录
saves_dir = os.path.join(os.path.dirname(__file__), 'saves')
if not os.path.exists(saves_dir):
    os.makedirs(saves_dir)
logger.info(f"保存目录: {saves_dir}")

# 缓存目录
cache_dir = os.path.join(saves_dir, 'gene_cache')
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)

# 缓存文件
cache_file = os.path.join(cache_dir, 'gene_cache.pickle')
cache_txt = os.path.join(cache_dir, 'gene_cache.txt')

# 参数定义
BATCH_SIZE = 100
MAX_RETRIES = 5
RETRY_DELAY = 3

def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='简单的基因ID转换工具')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE, help='每批处理的ID数量')
    parser.add_argument('--start', type=int, default=0, help='起始位置')
    parser.add_argument('--limit', type=int, default=0, help='处理的ID数量上限 (0表示全部处理)')
    parser.add_argument('--update-jsons', action='store_true', help='更新疾病JSON文件')
    parser.add_argument('--force-update', action='store_true', help='强制更新已缓存的基因')
    return parser.parse_args()

def load_cache():
    """加载缓存数据"""
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                cache = pickle.load(f)
            logger.info(f"已加载 {len(cache)} 个基因的缓存数据")
            return cache
        except Exception as e:
            logger.error(f"加载缓存文件时出错: {e}")
    
    # 尝试从文本缓存加载
    if os.path.exists(cache_txt):
        try:
            cache = {}
            with open(cache_txt, 'r', encoding='utf-8') as f:
                # 跳过标题行
                header = f.readline()
                for line in f:
                    parts = line.strip().split('\t')
                    if len(parts) >= 3:
                        entrez_id, symbol, description = parts[0], parts[1], parts[2]
                        cache[entrez_id] = {'symbol': symbol, 'description': description}
            logger.info(f"已从文本缓存加载 {len(cache)} 个基因")
            return cache
        except Exception as e:
            logger.error(f"加载文本缓存时出错: {e}")
    
    return {}

def save_cache(cache):
    """保存缓存数据"""
    try:
        # 保存为pickle文件（快速加载）
        with open(cache_file, 'wb') as f:
            pickle.dump(cache, f)
        
        # 同时保存为文本文件（便于查看）
        with open(cache_txt, 'w', encoding='utf-8') as f:
            f.write("Entrez_ID\tGene_Symbol\tDescription\n")
            for entrez_id, info in cache.items():
                symbol = info.get('symbol', f"Unknown_{entrez_id}")
                description = info.get('description', '')
                f.write(f"{entrez_id}\t{symbol}\t{description}\n")
        
        logger.info(f"已保存 {len(cache)} 个基因到缓存")
        return True
    except Exception as e:
        logger.error(f"保存缓存时出错: {e}")
        return False

def read_gene2id_file():
    """读取gene2id.txt文件中的基因ID"""
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
                    entrez_id = parts[0]
                    gene_ids.append(entrez_id)
        
        logger.info(f"从文件读取了 {len(gene_ids)} 个基因ID")
        return gene_ids
    except Exception as e:
        logger.error(f"读取基因ID文件时出错: {e}")
        return []

def fetch_gene_info_batch(gene_ids):
    """批量获取基因信息"""
    results = {}
    id_string = ",".join(gene_ids)
    
    # NCBI E-utilities API
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    params = {
        "db": "gene",
        "id": id_string,
        "retmode": "json",
        "tool": "gene_converter",
        "email": "your_email@example.com"  # 最好替换为真实邮箱
    }
    
    for retry in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'result' in data:
                    for gene_id in gene_ids:
                        if gene_id in data['result']:
                            gene_info = data['result'][gene_id]
                            
                            # 获取基因符号和描述
                            symbol = gene_info.get('symbol', '')
                            if not symbol:
                                symbol = gene_info.get('name', f"Unknown_{gene_id}")
                            
                            description = gene_info.get('description', '')
                            
                            results[gene_id] = {
                                'symbol': symbol,
                                'description': description
                            }
                        else:
                            # 对于找不到的ID，设置默认值
                            results[gene_id] = {
                                'symbol': f"Unknown_{gene_id}",
                                'description': ''
                            }
                break  # 成功获取数据，跳出重试循环
            
            elif response.status_code == 429:  # 请求太频繁
                wait_time = (retry + 1) * RETRY_DELAY
                logger.warning(f"API请求过于频繁，等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                logger.warning(f"API请求失败: {response.status_code}")
                time.sleep(RETRY_DELAY)
        
        except Exception as e:
            logger.error(f"获取基因信息时出错 (重试 {retry+1}/{MAX_RETRIES}): {e}")
            time.sleep(RETRY_DELAY)
    
    # 确保所有ID都有结果
    for gene_id in gene_ids:
        if gene_id not in results:
            results[gene_id] = {
                'symbol': f"Unknown_{gene_id}",
                'description': ''
            }
    
    return results

def process_gene_ids(gene_ids, args, cache):
    """处理所有基因ID"""
    # 限制处理数量
    if args.limit > 0:
        gene_ids = gene_ids[args.start:args.start + args.limit]
    elif args.start > 0:
        gene_ids = gene_ids[args.start:]
    
    logger.info(f"准备处理 {len(gene_ids)} 个基因ID")
    
    # 分批处理
    batch_size = args.batch_size
    total = len(gene_ids)
    processed = 0
    
    with tqdm(total=total, desc="处理基因ID") as pbar:
        for i in range(0, total, batch_size):
            batch = gene_ids[i:i+batch_size]
            
            # 筛选出需要获取的ID（排除已缓存的）
            if args.force_update:
                # 强制更新所有ID
                ids_to_fetch = batch
            else:
                # 只获取未缓存的ID
                ids_to_fetch = [id for id in batch if id not in cache]
            
            # 更新已缓存的ID的进度条
            cached_count = len(batch) - len(ids_to_fetch)
            if cached_count > 0:
                pbar.update(cached_count)
                processed += cached_count
            
            # 如果有需要获取的ID
            if ids_to_fetch:
                # 获取信息
                batch_results = fetch_gene_info_batch(ids_to_fetch)
                
                # 更新缓存
                cache.update(batch_results)
                
                # 定期保存缓存
                if i % (batch_size * 10) == 0 and i > 0:
                    save_cache(cache)
                
                # 更新进度条
                pbar.update(len(ids_to_fetch))
                processed += len(ids_to_fetch)
            
            # 避免请求过于频繁
            time.sleep(1)
    
    # 保存最终结果
    save_cache(cache)
    logger.info(f"成功处理 {processed}/{total} 个基因ID")
    
    return cache

def save_to_output_file(gene_info, output_file='ID2Gene.txt'):
    """保存结果到输出文件"""
    output_path = os.path.join(saves_dir, output_file)
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            # 写入标题行
            f.write("Entrez_ID\tGene_Symbol\tDescription\n")
            
            # 按ID排序
            sorted_ids = sorted(gene_info.keys())
            
            # 写入数据
            for gene_id in sorted_ids:
                info = gene_info[gene_id]
                symbol = info.get('symbol', f"Unknown_{gene_id}")
                description = info.get('description', '')
                f.write(f"{gene_id}\t{symbol}\t{description}\n")
        
        logger.info(f"成功保存 {len(gene_info)} 个基因映射到: {output_path}")
        return True
    except Exception as e:
        logger.error(f"保存到输出文件时出错: {e}")
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
                            if symbol and not symbol.startswith("Unknown_"):
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
                            if symbol and not symbol.startswith("Unknown_"):
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
    args = parse_args()
    
    logger.info("开始运行简化版基因ID转换工具...")
    
    # 加载缓存
    cache = load_cache()
    
    # 读取基因ID
    gene_ids = read_gene2id_file()
    
    if not gene_ids:
        logger.error("没有找到任何基因ID，无法继续")
        return
    
    # 处理基因ID
    gene_info = process_gene_ids(gene_ids, args, cache)
    
    # 保存到输出文件
    save_to_output_file(gene_info)
    
    # 如果需要，更新疾病文件
    if args.update_jsons:
        update_disease_files(gene_info)
    
    logger.info("处理完成！")

if __name__ == "__main__":
    main() 