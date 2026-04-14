#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
将Entrez ID转换为基因符号，并保存到ID2Gene.txt文件
"""

import os
import sys
import json
import time
import requests
import argparse
from tqdm import tqdm
import logging
import csv

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger('entrez-id-converter')

# 命令行参数解析
def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='将Entrez ID转换为基因符号并保存到ID2Gene.txt文件')
    parser.add_argument('--refresh', action='store_true', help='强制刷新所有数据，忽略现有映射')
    parser.add_argument('--limit', type=int, default=0, help='限制处理的Entrez ID数量，用于测试（0表示不限制）')
    parser.add_argument('--source', choices=['ncbi', 'hgnc', 'both'], default='both', 
                        help='选择数据源: ncbi, hgnc, 或两者都用(both)')
    return parser.parse_args()

# 添加项目根目录到系统路径
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.append(root_path)

logger.info(f"项目根路径: {root_path}")

# 数据集路径
dataset_path = os.path.join(root_path, 'Dataset')
logger.info(f"数据集路径: {dataset_path}")

# 保存目录
saves_dir = os.path.join(os.path.dirname(__file__), 'saves')
if not os.path.exists(saves_dir):
    os.makedirs(saves_dir)
logger.info(f"保存目录: {saves_dir}")

# 确保路径存在
if not os.path.exists(dataset_path):
    logger.error(f"数据集路径不存在: {dataset_path}")
    sys.exit(1)

def batch_fetch_gene_info(entrez_ids, batch_size=100):
    """
    批量获取Entrez ID的基因信息
    
    Args:
        entrez_ids: Entrez ID列表
        batch_size: 每批次处理的ID数量
        
    Returns:
        dict: Entrez ID到基因符号的映射字典
    """
    results = {}
    total_batches = (len(entrez_ids) + batch_size - 1) // batch_size
    
    for i in tqdm(range(0, len(entrez_ids), batch_size), desc="获取基因信息", total=total_batches):
        batch = entrez_ids[i:i+batch_size]
        id_string = ",".join(batch)
        
        try:
            # 使用NCBI E-utilities API
            url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id={id_string}&retmode=json"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # 解析结果
                if 'result' in data:
                    for entrez_id in batch:
                        if entrez_id in data['result']:
                            gene_info = data['result'][entrez_id]
                            # 提取正式的基因符号 (Symbol)，而不是name
                            gene_symbol = gene_info.get('symbol', '')
                            # 如果symbol为空，尝试其他字段
                            if not gene_symbol:
                                gene_symbol = gene_info.get('name', '')
                            # 如果description字段存在，添加到结果中
                            description = gene_info.get('description', '')
                            # 保存基因符号和描述
                            results[entrez_id] = {
                                'symbol': gene_symbol,
                                'description': description
                            }
                        else:
                            results[entrez_id] = {
                                'symbol': f"Unknown_{entrez_id}",
                                'description': ""
                            }
            else:
                logger.warning(f"API请求失败: {response.status_code}")
                # 对于失败的批次，使用默认值
                for entrez_id in batch:
                    results[entrez_id] = {
                        'symbol': f"Unknown_{entrez_id}",
                        'description': ""
                    }
        
        except Exception as e:
            logger.error(f"获取基因信息时出错: {e}")
            # 对于异常情况，使用默认值
            for entrez_id in batch:
                results[entrez_id] = {
                    'symbol': f"Unknown_{entrez_id}",
                    'description': ""
                }
        
        # 限制请求频率，避免API限制
        time.sleep(0.5)
    
    return results

def fetch_entrez_ids_from_gene2id():
    """
    从gene2id.txt文件中获取Entrez ID列表
    
    Returns:
        list: Entrez ID列表
    """
    entrez_ids = []
    gene2id_path = os.path.join(dataset_path, 'gene2id.txt')
    
    if not os.path.exists(gene2id_path):
        logger.error(f"基因ID文件不存在: {gene2id_path}")
        return []
    
    try:
        with open(gene2id_path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 1:
                    # 假设第一列是Entrez ID
                    entrez_id = parts[0]
                    entrez_ids.append(entrez_id)
        
        logger.info(f"从gene2id.txt文件中获取了 {len(entrez_ids)} 个Entrez ID")
        return entrez_ids
    except Exception as e:
        logger.error(f"读取gene2id.txt文件出错: {e}")
        return []

def fetch_entrez_ids_from_disease_data():
    """
    从疾病数据文件中提取所有关联的Entrez ID
    
    Returns:
        list: 去重后的Entrez ID列表
    """
    entrez_ids = set()
    
    # 从total_diseases_info.json或其他保存文件中提取
    disease_info_path = os.path.join(saves_dir, 'total_diseases_info.json')
    
    if not os.path.exists(disease_info_path):
        logger.warning(f"疾病信息文件不存在: {disease_info_path}")
        # 尝试从服务器端的other目录或所有疾病文件中获取
        # 查找所有保存的疾病文件
        disease_files = [f for f in os.listdir(saves_dir) if f.endswith('.json') and f != 'total_diseases_info.json']
        
        for disease_file in disease_files:
            try:
                with open(os.path.join(saves_dir, disease_file), 'r', encoding='utf-8') as f:
                    disease_data = json.load(f)
                    
                    # 检查是列表还是单个对象
                    if isinstance(disease_data, list):
                        for disease in disease_data:
                            if 'attributes' in disease and 'associated_gene_names' in disease['attributes']:
                                gene_ids = disease['attributes']['associated_gene_names']
                                entrez_ids.update(gene_ids)
                    else:
                        if 'attributes' in disease_data and 'associated_gene_names' in disease_data['attributes']:
                            gene_ids = disease_data['attributes']['associated_gene_names']
                            entrez_ids.update(gene_ids)
            except Exception as e:
                logger.error(f"处理文件 {disease_file} 时出错: {e}")
        
    else:
        try:
            with open(disease_info_path, 'r', encoding='utf-8') as f:
                diseases = json.load(f)
                
                for disease in diseases:
                    if 'attributes' in disease and 'associated_gene_names' in disease['attributes']:
                        gene_ids = disease['attributes']['associated_gene_names']
                        entrez_ids.update(gene_ids)
        except Exception as e:
            logger.error(f"读取疾病信息文件出错: {e}")
    
    logger.info(f"从疾病数据中提取了 {len(entrez_ids)} 个唯一的Entrez ID")
    return list(entrez_ids)

def get_entrez_ids_from_multiple_sources():
    """
    从多个来源获取Entrez ID
    
    Returns:
        list: 去重后的Entrez ID列表
    """
    # 首先尝试从gene2id.txt获取
    ids_from_gene2id = fetch_entrez_ids_from_gene2id()
    
    # 然后从疾病数据中获取
    ids_from_diseases = fetch_entrez_ids_from_disease_data()
    
    # 合并并去重
    all_ids = set(ids_from_gene2id).union(set(ids_from_diseases))
    
    logger.info(f"总共获取了 {len(all_ids)} 个唯一的Entrez ID")
    return list(all_ids)

def fetch_gene_info_from_hgnc(entrez_id):
    """
    从HGNC数据库获取基因信息（备选方法）
    
    Args:
        entrez_id: Entrez ID
        
    Returns:
        dict: 包含基因符号和描述的字典
    """
    try:
        # 使用HGNC REST API
        url = f"https://rest.genenames.org/fetch/entrez_id/{entrez_id}"
        headers = {"Accept": "application/json"}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'response' in data and 'docs' in data['response'] and len(data['response']['docs']) > 0:
                gene_data = data['response']['docs'][0]
                symbol = gene_data.get('symbol', '')
                name = gene_data.get('name', '')
                
                return {
                    'symbol': symbol,
                    'description': name
                }
        
        # 如果未找到或发生错误，返回默认值
        return {
            'symbol': f"Unknown_{entrez_id}",
            'description': ""
        }
    except Exception as e:
        logger.error(f"从HGNC获取基因 {entrez_id} 信息时出错: {e}")
        return {
            'symbol': f"Unknown_{entrez_id}",
            'description': ""
        }

def read_existing_gene_mappings():
    """
    读取现有的基因映射文件
    
    Returns:
        dict: Entrez ID到基因符号的映射字典
    """
    output_file = os.path.join(saves_dir, 'ID2Gene.txt')
    result = {}
    
    if not os.path.exists(output_file):
        logger.info("现有基因映射文件不存在，将创建新文件")
        return result
    
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            # 跳过标题行
            header = f.readline()
            
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) >= 3:
                    entrez_id = parts[0]
                    symbol = parts[1]
                    description = parts[2]
                    result[entrez_id] = {
                        'symbol': symbol, 
                        'description': description
                    }
                elif len(parts) >= 2:
                    entrez_id = parts[0]
                    symbol = parts[1]
                    result[entrez_id] = {
                        'symbol': symbol, 
                        'description': ""
                    }
        
        logger.info(f"从现有文件中读取了 {len(result)} 个基因映射")
    except Exception as e:
        logger.error(f"读取现有基因映射文件时出错: {e}")
    
    return result

def convert_and_save_gene_mappings(refresh=False, limit=0, source='both'):
    """
    获取Entrez ID，转换为基因符号，并保存结果
    
    Args:
        refresh: 是否强制刷新所有数据
        limit: 限制处理的ID数量，用于测试
        source: 数据源选择('ncbi', 'hgnc', 或 'both')
        
    Returns:
        dict: Entrez ID到基因符号的映射字典
    """
    # 读取现有映射（如果不刷新）
    existing_mappings = {} if refresh else read_existing_gene_mappings()
    
    # 获取Entrez ID
    entrez_ids = get_entrez_ids_from_multiple_sources()
    
    if not entrez_ids:
        logger.error("没有找到任何Entrez ID，无法继续转换")
        return existing_mappings  # 返回现有映射
    
    # 如果设置了limit，则限制ID数量
    if limit > 0 and limit < len(entrez_ids):
        logger.info(f"限制处理ID数量为 {limit} 个（测试模式）")
        entrez_ids = entrez_ids[:limit]
    
    # 过滤出需要获取的ID（排除已有映射的ID）
    ids_to_fetch = [id for id in entrez_ids if id not in existing_mappings] if not refresh else entrez_ids
    
    if not ids_to_fetch:
        logger.info("所有Entrez ID都已有映射，无需获取新数据")
        return existing_mappings
    
    logger.info(f"需要获取 {len(ids_to_fetch)} 个新的Entrez ID映射")
    
    new_id_to_gene = {}
    
    # 根据source参数决定使用哪个数据源
    if source in ['ncbi', 'both']:
        # 批量获取基因信息
        logger.info("开始从NCBI将Entrez ID转换为基因符号...")
        new_id_to_gene = batch_fetch_gene_info(ids_to_fetch)
    
    # 尝试使用HGNC获取未知的基因
    if source in ['hgnc', 'both']:
        if source == 'both':
            unknown_ids = [entrez_id for entrez_id, info in new_id_to_gene.items() 
                        if info['symbol'].startswith("Unknown_")]
        else:
            # 如果只使用HGNC，则处理所有ID
            unknown_ids = ids_to_fetch
        
        if unknown_ids:
            logger.info(f"从HGNC获取 {len(unknown_ids)} 个基因信息...")
            for entrez_id in tqdm(unknown_ids, desc="从HGNC获取基因信息"):
                hgnc_info = fetch_gene_info_from_hgnc(entrez_id)
                if source == 'both':
                    new_id_to_gene[entrez_id] = hgnc_info
                else:
                    new_id_to_gene[entrez_id] = hgnc_info
                # 避免请求过于频繁
                time.sleep(0.2)
    
    # 合并新旧映射
    id_to_gene = {**existing_mappings, **new_id_to_gene}
    
    # 保存结果
    output_file = os.path.join(saves_dir, 'ID2Gene.txt')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            # 写入标题行
            f.write("Entrez_ID\tGene_Symbol\tDescription\n")
            # 写入数据行
            for entrez_id, gene_info in id_to_gene.items():
                f.write(f"{entrez_id}\t{gene_info['symbol']}\t{gene_info['description']}\n")
        
        logger.info(f"成功保存 {len(id_to_gene)} 个基因ID映射到 {output_file}")
    except Exception as e:
        logger.error(f"保存基因映射文件时出错: {e}")
    
    return id_to_gene

def update_disease_files_with_gene_symbols(gene_mappings):
    """
    更新疾病文件中的基因名称
    
    Args:
        gene_mappings: Entrez ID到基因符号的映射字典
        
    Returns:
        int: 更新的文件数量
    """
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
                        if gene_id in gene_mappings and 'symbol' in gene_mappings[gene_id]:
                            symbol = gene_mappings[gene_id]['symbol']
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
                        if gene_id in gene_mappings and 'symbol' in gene_mappings[gene_id]:
                            symbol = gene_mappings[gene_id]['symbol']
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
    args = parse_arguments()
    
    logger.info("开始执行将Entrez ID转换为基因符号的脚本...")
    logger.info(f"参数: refresh={args.refresh}, limit={args.limit}, source={args.source}")
    
    try:
        # 获取基因映射并保存
        id_to_gene = convert_and_save_gene_mappings(
            refresh=args.refresh,
            limit=args.limit,
            source=args.source
        )
        logger.info(f"成功处理 {len(id_to_gene)} 个基因ID映射")
        
        # 更新疾病文件中的基因符号
        update_disease_files_with_gene_symbols(id_to_gene)
    except Exception as e:
        logger.error(f"执行脚本时发生错误: {e}")
        sys.exit(1)
    
    logger.info("脚本执行完毕!")

if __name__ == "__main__":
    main() 