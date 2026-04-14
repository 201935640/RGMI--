#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
优化版疾病信息获取工具：使用多线程、缓存和批量处理加快获取速度
"""

import os
import sys
import json
import time
import pickle
import threading
import requests
import argparse
from tqdm import tqdm
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger('disease-fetcher')

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
cache_dir = os.path.join(saves_dir, 'disease_cache')
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)

# 缓存文件
cache_file = os.path.join(cache_dir, 'disease_cache.pickle')
cache_txt = os.path.join(cache_dir, 'disease_cache.txt')

# 参数设置
BATCH_SIZE = 1         # 每批处理的疾病数量
THREAD_COUNT = 30170        # 线程数量
MAX_RETRIES = 100         # 最大重试次数
RETRY_DELAY = 2         # 重试延迟（秒）
API_DELAY = 0.1         # API请求间隔（秒）

# 尝试导入必要的模块
try:
    # 导入RGMI_pretrain_model
    sys.path.append(os.path.join(root_path, 'Web'))
    from Web.RGMI_pretrain.RGMI_pretrain_model import fetch_disease_info, load_disease_mapping
    logger.info(f"成功导入RGMI_pretrain_model模块")
except ImportError as e:
    logger.error(f"导入模块失败: {e}")
    sys.exit(1)

def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='优化版疾病信息获取工具')
    parser.add_argument('--threads', type=int, default=THREAD_COUNT, help='线程数量')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE, help='每批处理的疾病数量')
    parser.add_argument('--start', type=int, default=0, help='起始位置')
    parser.add_argument('--limit', type=int, default=0, help='处理的疾病数量上限 (0表示全部处理)')
    parser.add_argument('--force-update', action='store_true', help='强制更新已缓存的疾病信息')
    parser.add_argument('--output', default='total_diseases_info.json', help='输出文件名')
    return parser.parse_args()

def load_cache():
    """加载疾病缓存数据"""
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                cache = pickle.load(f)
            logger.info(f"已加载 {len(cache)} 个疾病的缓存数据")
            return cache
        except Exception as e:
            logger.error(f"加载缓存文件时出错: {e}")
    
    # 尝试从文本缓存加载
    if os.path.exists(cache_txt):
        try:
            cache = {}
            with open(cache_txt, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        disease_data = json.loads(line.strip())
                        if 'disease_id' in disease_data:
                            cache[disease_data['disease_id']] = disease_data
                    except Exception:
                        continue
            logger.info(f"已从文本缓存加载 {len(cache)} 个疾病信息")
            return cache
        except Exception as e:
            logger.error(f"加载文本缓存时出错: {e}")
    
    return {}

def save_cache(cache):
    """保存疾病缓存数据"""
    try:
        # 保存为pickle文件（快速加载）
        with open(cache_file, 'wb') as f:
            pickle.dump(cache, f)
        
        # 同时保存为文本文件（便于查看）
        with open(cache_txt, 'w', encoding='utf-8') as f:
            for disease_id, info in cache.items():
                f.write(json.dumps(info, ensure_ascii=False) + '\n')
        
        logger.info(f"已保存 {len(cache)} 个疾病信息到缓存")
        return True
    except Exception as e:
        logger.error(f"保存缓存时出错: {e}")
        return False

def fetch_disease_batch(disease_ids, disease_id_to_idx, result_dict, lock, pbar):
    """批量获取疾病信息"""
    local_results = {}
    
    for i, disease_id in enumerate(disease_ids):
        try:
            for retry in range(MAX_RETRIES):
                try:
                    # 从NCBI MedGen获取详细信息
                    disease_info = fetch_disease_info(disease_id)
                    
                    # 添加索引信息
                    if disease_info:
                        disease_info["idx"] = disease_id_to_idx.get(disease_id, 0)
                        local_results[disease_id] = disease_info
                        break  # 成功获取，跳出重试循环
                    else:
                        # 如果是最后一次重试还是失败，创建基本条目
                        if retry == MAX_RETRIES - 1:
                            logger.warning(f"未获取到疾病 {disease_id} 的详细信息")
                            # 创建一个基本的条目
                            basic_info = {
                                "disease_id": disease_id,
                                "name": f"Disease {disease_id}",
                                "definition": "",
                                "idx": disease_id_to_idx.get(disease_id, 0),
                                "attributes": {"semantictype": "Unknown"}
                            }
                            local_results[disease_id] = basic_info
                    
                    # 短暂延迟避免API限制
                    time.sleep(API_DELAY)
                
                except Exception as e:
                    logger.error(f"获取疾病 {disease_id} 详细信息时出错 (重试 {retry+1}/{MAX_RETRIES}): {e}")
                    if retry == MAX_RETRIES - 1:
                        # 最后一次重试仍然失败，创建基本条目
                        basic_info = {
                            "disease_id": disease_id,
                            "name": f"Disease {disease_id}",
                            "definition": "",
                            "idx": disease_id_to_idx.get(disease_id, 0),
                            "attributes": {"semantictype": "Unknown"}
                        }
                        local_results[disease_id] = basic_info
                    else:
                        # 稍等后重试
                        time.sleep(RETRY_DELAY)
        
        except Exception as e:
            logger.error(f"处理疾病 {disease_id} 时发生异常: {e}")
            # 创建基本条目
            basic_info = {
                "disease_id": disease_id,
                "name": f"Disease {disease_id}",
                "definition": "",
                "idx": disease_id_to_idx.get(disease_id, 0),
                "attributes": {"semantictype": "Unknown"}
            }
            local_results[disease_id] = basic_info
    
    # 更新全局结果字典和进度条
    with lock:
        result_dict.update(local_results)
        pbar.update(len(disease_ids))

def read_disease_ids():
    """读取疾病ID映射"""
    disease_mapping_file = os.path.join(dataset_path, 'dis2id.txt')
    if not os.path.exists(disease_mapping_file):
        logger.error(f"疾病映射文件不存在: {disease_mapping_file}")
        sys.exit(1)
    
    disease_ids = []
    disease_id_to_idx = {}
    
    # 读取疾病ID
    try:
        with open(disease_mapping_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 2:
                    disease_id = parts[0]
                    disease_idx = int(parts[1])
                    disease_ids.append(disease_id)
                    disease_id_to_idx[disease_id] = disease_idx
        
        logger.info(f"成功读取 {len(disease_ids)} 个疾病ID")
        return disease_ids, disease_id_to_idx
    except Exception as e:
        logger.error(f"读取疾病映射文件出错: {e}")
        sys.exit(1)

def process_disease_ids(disease_ids, disease_id_to_idx, args, cache):
    """处理所有疾病ID"""
    # 限制处理数量
    if args.limit > 0:
        disease_ids = disease_ids[args.start:args.start + args.limit]
    elif args.start > 0:
        disease_ids = disease_ids[args.start:]
    
    logger.info(f"准备处理 {len(disease_ids)} 个疾病ID")
    
    # 创建结果字典和互斥锁
    result_dict = {}
    lock = threading.Lock()
    
    # 筛选需要获取的疾病ID（排除已缓存的）
    if args.force_update:
        # 强制更新所有ID
        ids_to_fetch = disease_ids
    else:
        # 只获取未缓存的ID
        ids_to_fetch = [id for id in disease_ids if id not in cache]
        # 添加缓存的疾病信息到结果字典
        for id in disease_ids:
            if id in cache:
                result_dict[id] = cache[id]
    
    logger.info(f"需要获取 {len(ids_to_fetch)} 个疾病的信息，已有 {len(disease_ids) - len(ids_to_fetch)} 个已缓存")
    
    # 如果没有需要获取的ID，直接返回缓存结果
    if not ids_to_fetch:
        logger.info("所有疾病信息已缓存，无需获取新数据")
        return result_dict
    
    # 分批处理
    batch_size = args.batch_size
    thread_count = min(args.threads, len(ids_to_fetch))
    
    # 将疾病ID划分为多个批次
    batches = []
    for i in range(0, len(ids_to_fetch), batch_size):
        batch = ids_to_fetch[i:i+batch_size]
        batches.append(batch)
    
    logger.info(f"将使用 {thread_count} 个线程处理 {len(batches)} 个批次")
    
    # 创建进度条
    with tqdm(total=len(ids_to_fetch), desc="获取疾病信息") as pbar:
        # 使用线程池并行处理
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            
            # 提交任务
            for batch in batches:
                future = executor.submit(
                    fetch_disease_batch, 
                    batch, 
                    disease_id_to_idx, 
                    result_dict, 
                    lock, 
                    pbar
                )
                futures.append(future)
            
            # 等待所有任务完成
            for future in futures:
                future.result()
    
    # 更新缓存
    for disease_id, info in result_dict.items():
        cache[disease_id] = info
    
    # 保存缓存
    save_cache(cache)
    
    return result_dict

def save_to_output_file(disease_info_dict, disease_id_to_idx, output_file):
    """将结果保存到JSON文件"""
    # 将字典转换为列表
    disease_info_list = list(disease_info_dict.values())
    
    # 按索引排序
    disease_info_list.sort(key=lambda x: x.get("idx", 0))
    
    # 保存结果
    output_path = os.path.join(saves_dir, output_file)
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(disease_info_list, f, ensure_ascii=False, indent=2)
        logger.info(f"成功保存 {len(disease_info_list)} 个疾病信息到: {output_path}")
        return True
    except Exception as e:
        logger.error(f"保存疾病信息到文件时出错: {e}")
        return False

def main():
    """主函数"""
    # 解析命令行参数
    args = parse_args()
    
    logger.info("开始执行优化版疾病信息获取脚本...")
    
    # 加载缓存
    cache = load_cache()
    
    # 读取疾病ID
    disease_ids, disease_id_to_idx = read_disease_ids()
    
    # 处理疾病ID
    disease_info = process_disease_ids(disease_ids, disease_id_to_idx, args, cache)
    
    # 保存结果到输出文件
    save_to_output_file(disease_info, disease_id_to_idx, args.output)
    
    logger.info("处理完成！")

if __name__ == "__main__":
    main() 