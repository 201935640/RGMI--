/**
 * 导出服务模块
 * 根据API文档调用后端导出接口
 */
import axios from 'axios';

const DEFAULT_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  }
});

/**
 * 导出相似度分析结果
 * @param {string} disease_id_1 - 第一个疾病ID
 * @param {string} disease_id_2 - 第二个疾病ID
 * @param {string} format - 导出格式 ('csv' 或 'json')
 * @param {object} options - 其他选项
 */
export const exportSimilarityAnalysis = async (disease_id_1, disease_id_2, format = 'csv', options = {}) => {
  try {
    console.log(`[导出] 开始导出相似度分析: ${disease_id_1} vs ${disease_id_2}, 格式: ${format}`);

    const payload = {
      id1: disease_id_1,
      id2: disease_id_2,
      format,
      algorithm: options.algorithm || 'cosine',
      dimension: options.dimension || 'all',
      top_k: options.top_k || 10
    };

    console.log('[导出] 请求负载:', payload);

    const response = await apiClient.post('/export/custom_similarity/compare', payload, {
      responseType: 'blob'
    });

    console.log(`[导出] 响应状态: ${response.status}, 内容类型: ${response.headers['content-type']}`);

    const blob = response.data;
    console.log(`[导出] 获得 blob 数据, 大小: ${blob.size} bytes`);

    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    downloadFile(blob, `disease_similarity_${disease_id_1}_${disease_id_2}.${format}`, mimeType);

    return true;
  } catch (error) {
    console.error('[导出] 导出相似度分析失败:', error);
    throw error;
  }
};

/**
 * 导出疾病详细信息
 * @param {string} diseaseId - 单个疾病ID
 * @param {string} format - 导出格式 ('csv' 或 'json')
 */
export const exportDiseaseInfo = async (diseaseId, format = 'csv') => {
  try {
    console.log(`[导出] 开始导出疾病信息: ${diseaseId}, 格式: ${format}`);

    const response = await apiClient.get('/export/disease_info', {
      params: {
        disease_id: diseaseId,
        format
      },
      responseType: 'blob'
    });

    console.log(`[导出] 响应状态: ${response.status}, 内容类型: ${response.headers['content-type']}`);

    const blob = response.data;
    console.log(`[导出] 获得 blob 数据, 大小: ${blob.size} bytes`);

    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    downloadFile(blob, `disease_info_${diseaseId}.${format}`, mimeType);

    return true;
  } catch (error) {
    console.error('[导出] 导出疾病信息失败:', error);
    throw error;
  }
};

/**
 * 导出推荐药物结果
 * @param {string} diseaseId - 疾病ID
 * @param {string} format - 导出格式 ('csv' 或 'json')
 */
export const exportDrugRepositioning = async (diseaseId, format = 'csv') => {
  try {
    console.log(`[导出] 开始导出推荐药物: ${diseaseId}, 格式: ${format}`);

    const response = await apiClient.get('/export/drug_repositioning', {
      params: {
        disease_id: diseaseId,
        format
      },
      responseType: 'blob'
    });

    console.log(`[导出] 响应状态: ${response.status}, 内容类型: ${response.headers['content-type']}`);

    const blob = response.data;
    console.log(`[导出] 获得 blob 数据, 大小: ${blob.size} bytes`);

    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    downloadFile(blob, `drug_repositioning_${diseaseId}.${format}`, mimeType);

    return true;
  } catch (error) {
    console.error('[导出] 导出推荐药物失败:', error);
    throw error;
  }
};

/**
 * 通用文件下载函数
 * @param {Blob} blob - 文件数据
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME类型
 */
const downloadFile = (blob, filename, mimeType) => {
  try {
    console.log(`[导出] 开始下载文件: ${filename}, 大小: ${blob.size} bytes, 类型: ${mimeType}`);

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // 延迟清理，确保下载完成
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log(`[导出] 文件下载完成: ${filename}`);
    }, 100);
  } catch (error) {
    console.error('[导出] 文件下载失败:', error);
    throw error;
  }
};

export default {
  exportSimilarityAnalysis,
  exportDiseaseInfo,
  exportDrugRepositioning
};
