#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
扫描所有疾病编号，获取详细信息，并保存到total_diseases_info.json文件
"""

import os
import sys
import json
import time
import requests
from tqdm import tqdm
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger('fetch-diseases')

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

# 尝试导入必要的模块
try:
    # 导入RGMI_pretrain_model
    sys.path.append(os.path.join(root_path, 'Web'))
    from Web.RGMI_pretrain.RGMI_pretrain_model import fetch_disease_info, load_disease_mapping
    logger.info(f"成功导入RGMI_pretrain_model模块")
except ImportError as e:
    logger.error(f"导入模块失败: {e}")
    sys.exit(1)

def fetch_all_disease_details():
    """获取所有疾病的详细信息"""
    logger.info("开始获取所有疾病详细信息...")
    
    # 加载疾病ID映射
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
    except Exception as e:
        logger.error(f"读取疾病映射文件出错: {e}")
        sys.exit(1)
    
    # 创建结果列表
    all_diseases_info = []
    
    # 获取每个疾病的详细信息
    for i, disease_id in enumerate(tqdm(disease_ids, desc="获取疾病信息")):
        try:
            # 从NCBI MedGen获取详细信息
            disease_info = fetch_disease_info(disease_id)
            
            # 添加索引信息
            if disease_info:
                disease_info["idx"] = disease_id_to_idx.get(disease_id, i)
                all_diseases_info.append(disease_info)
            else:
                logger.warning(f"未获取到疾病 {disease_id} 的详细信息")
                # 创建一个基本的条目
                basic_info = {
                    "disease_id": disease_id,
                    "name": f"Disease {disease_id}",
                    "definition": "",
                    "idx": disease_id_to_idx.get(disease_id, i),
                    "attributes": {"semantictype": "Unknown"}
                }
                all_diseases_info.append(basic_info)
            
            # 限制请求频率，避免API限制
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"获取疾病 {disease_id} 详细信息时出错: {e}")
            # 创建一个基本的条目
            basic_info = {
                "disease_id": disease_id,
                "name": f"Disease {disease_id}",
                "definition": "",
                "idx": disease_id_to_idx.get(disease_id, i),
                "attributes": {"semantictype": "Unknown"}
            }
            all_diseases_info.append(basic_info)
    
    # 按照疾病ID排序
    all_diseases_info.sort(key=lambda x: x.get("idx", 0))
    
    # 保存结果到JSON文件
    output_file = os.path.join(saves_dir, 'total_diseases_info.json')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_diseases_info, f, ensure_ascii=False, indent=2)
        logger.info(f"成功保存所有疾病信息到: {output_file}")
    except Exception as e:
        logger.error(f"保存疾病信息到文件时出错: {e}")
    
    return all_diseases_info

def main():
    """主函数"""
    logger.info("开始执行获取所有疾病详细信息的脚本...")
    
    try:
        # 获取并保存所有疾病详细信息
        all_diseases_info = fetch_all_disease_details()
        logger.info(f"成功获取 {len(all_diseases_info)} 个疾病的详细信息")
    except Exception as e:
        logger.error(f"执行脚本时发生错误: {e}")
        sys.exit(1)
    
    logger.info("脚本执行完毕!")

if __name__ == "__main__":
    main() 