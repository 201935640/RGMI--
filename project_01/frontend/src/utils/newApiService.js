import axios from 'axios';

// 默认API基础URL
const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 120000, // 将超时时间增加到120秒
  headers: {
    'Content-Type': 'application/json',
  }
});

/**
 * API服务类
 */
class NewApiService {
  constructor() {
    this.apiConnected = false;
    this.isMockData = false;
    this.apiUrl = DEFAULT_API_BASE_URL;
    this.cache = {};
    this.cacheTimeout = 3600 * 1000; // 缓存超时时间（毫秒）
    this.logLevel = 'info'; // 日志级别: debug, info, warn, error
    
    console.log(`API服务初始化完成 - 基础URL: ${this.apiUrl}, 超时时间: ${this.cacheTimeout}ms`);
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别: debug, info, warn, error
   */
  setLogLevel(level) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (validLevels.includes(level)) {
      this.logLevel = level;
      this.log('info', `日志级别已设置为: ${level}`);
    } else {
      this.log('error', `无效的日志级别: ${level}，有效值为: ${validLevels.join(', ')}`);
    }
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  log(level, message, data = null) {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    if (levels[level] >= levels[this.logLevel]) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}][RGMI API][${level.toUpperCase()}]`;
      
      if (data) {
        console[level](`${prefix} ${message}`, data);
      } else {
        console[level](`${prefix} ${message}`);
      }
    }
  }

  /**
   * 初始化API连接
   * @returns {Promise<Object>} API状态
   */
  async initializeApi() {
    try {
      this.log('info', '正在检查API连接状态...');
      const startTime = Date.now();
      const response = await apiClient.get('/health');
      const endTime = Date.now();
      
      this.apiConnected = response.data.status === 'healthy';
      this.isMockData = !response.data.model_available;
      
      // this.log('info','response的值为:', response);
      this.log('info', `API连接状态: ${this.apiConnected ? '已连接' : '未连接'}, 使用模拟数据: ${this.isMockData}, 响应时间: ${endTime - startTime}ms`);
      this.log('debug', '服务器返回的健康状态详情:', response.data);
      
      return {
        connected: this.apiConnected,
        isMockData: this.isMockData,
        details: response.data,
        responseTime: endTime - startTime
      };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : '无响应数据'
      };
      
      this.log('error', 'API连接检查失败:', errorDetails);
      this.apiConnected = false;
      this.isMockData = true;
      
      return {
        connected: false,
        isMockData: true,
        error: error.message,
        errorDetails: errorDetails
      };
    }
  }

  /**
   * 检查API连接状态
   * @returns {Promise<Object>} API状态
   */
  async checkApiStatus() {
    return this.initializeApi();
  }

  /**
   * 获取API状态（供欢迎页面使用）
   * @returns {Promise<Object>} API状态和系统信息
   */
  async getApiStatus() {
    try {
      const statusResult = await this.checkApiStatus();
      
      return {
        status: statusResult.connected ? 'ok' : 'error',
        version: '1.0.0',
        model_available: !statusResult.isMockData,
        disease_count: 30170,
        gene_count: 17247,
        mirna_count: 4797,
        api_health: statusResult.connected ? 'healthy' : 'unhealthy',
        details: statusResult.details || null
      };
    } catch (error) {
      this.log('error', '获取API状态失败:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 从缓存获取数据
   * @param {string} key 缓存键
   * @returns {any} 缓存数据或null
   */
  getFromCache(key) {
    if (this.cache[key] && (Date.now() - this.cache[key].timestamp) < this.cacheTimeout) {
      const ageInSeconds = Math.round((Date.now() - this.cache[key].timestamp) / 1000);
      this.log('debug', `从缓存获取数据: ${key}, 缓存年龄: ${ageInSeconds}秒`);
      return this.cache[key].data;
    }
    
    if (this.cache[key]) {
      this.log('debug', `缓存数据已过期: ${key}, 缓存已存在 ${Math.round((Date.now() - this.cache[key].timestamp) / 1000)} 秒`);
    } else {
      this.log('debug', `缓存中不存在键: ${key}`);
    }
    
    return null;
  }

  /**
   * 保存数据到缓存
   * @param {string} key 缓存键
   * @param {any} data 数据
   */
  saveToCache(key, data) {
    if (!data) {
      this.log('warn', `尝试缓存空数据: ${key}`);
      return;
    }
    
    const dataSize = JSON.stringify(data).length;
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      size: dataSize
    };
    
    this.log('debug', `数据已保存到缓存: ${key}, 大小: ${Math.round(dataSize / 1024)}KB`);
    
    // 输出缓存统计信息
    const totalSize = Object.keys(this.cache)
      .reduce((sum, k) => sum + (this.cache[k].size || 0), 0);
    
    this.log('debug', `当前缓存状态: ${Object.keys(this.cache).length} 项, 总大小: ${Math.round(totalSize / 1024)}KB`);
  }

  /**
   * 清除缓存
   * @param {string} key 缓存键，如果不提供则清除所有缓存
   */
  clearCache(key) {
    if (key) {
      if (this.cache[key]) {
        delete this.cache[key];
        this.log('info', `已清除缓存项: ${key}`);
      } else {
        this.log('warn', `尝试清除不存在的缓存项: ${key}`);
      }
    } else {
      const itemCount = Object.keys(this.cache).length;
      this.cache = {};
      this.log('info', `已清除所有缓存项 (${itemCount} 项)`);
    }
  }

  /**
   * 获取所有疾病列表
   * @returns {Promise<Array>} 疾病列表
   */
  async fetchDiseases() {
    try {
      const cacheKey = 'diseases';
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        this.log('info', `从缓存返回疾病列表, 共 ${cachedData.length} 项`);
        return cachedData;
      }
      
      this.log('info', '从API获取疾病列表...');
      const startTime = Date.now();
      const response = await apiClient.get('/diseases');
      const endTime = Date.now();
      
      const diseases = response.data;
      this.log('info', `成功获取疾病列表, 共 ${diseases.length} 项, 响应时间: ${endTime - startTime}ms`);
      this.log('debug', '获取到的前5个疾病:', diseases.slice(0, 5));
      
      this.saveToCache(cacheKey, diseases);
      return diseases;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : '无响应数据'
      };
      
      this.log('error', '获取疾病列表失败:', errorDetails);
      throw new Error(`无法获取疾病列表: ${error.message}`);
    }
  }

  /**
   * 搜索疾病（按名称/ID，后端返回候选列表）
   * @param {string} query 搜索关键词
   * @param {number} limit 返回数量
   * @returns {Promise<Array>} 候选疾病列表
   */
  async searchDiseases(query, limit = 20) {
    try {
      const params = { q: query || '', limit };
      const response = await apiClient.get('/diseases/search', { params });
      return response.data || [];
    } catch (error) {
      this.log('warn', '搜索疾病失败:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null
      });
      return [];
    }
  }

  /**
   * 获取疾病详情
   * @param {string} diseaseId 疾病ID
   * @returns {Promise<Object>} 疾病详情
   */
  async fetchDiseaseDetail(diseaseId) {
    try {
      if (!diseaseId) {
        throw new Error('疾病ID不能为空');
      }
      
      this.log('info', `获取疾病详情: ${diseaseId}`);
      const cacheKey = `disease_${diseaseId}`;
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        this.log('info', `从缓存返回疾病 ${diseaseId} 的详情`);
        return cachedData;
      }
      
      this.log('info', `从API获取疾病 ${diseaseId} 的详情...`);
      const startTime = Date.now();
      const response = await apiClient.get(`/disease/${diseaseId}`);
      const endTime = Date.now();
      
      const diseaseDetail = response.data;
      this.log('info', `成功获取疾病 ${diseaseId} 的详情, 响应时间: ${endTime - startTime}ms`);
      this.log('debug', '获取到的疾病详情:', diseaseDetail);
      
      this.saveToCache(cacheKey, diseaseDetail);
      return diseaseDetail;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        diseaseId: diseaseId,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : '无响应数据'
      };
      
      this.log('error', `获取疾病 ${diseaseId} 详情失败:`, errorDetails);
      throw new Error(`无法获取疾病详情: ${error.message}`);
    }
  }

  /**
   * 查询疾病相似性
   * @param {string} diseaseId 疾病ID
   * @param {number} topN 返回的相似疾病数量，默认为20
   * @returns {Promise<Object>} 相似疾病列表
   */
  async queryDiseaseSimilarity(diseaseId, topN = 20) {
    try {
      if (!diseaseId) {
        throw new Error('疾病ID不能为空');
      }
      
      // 标准化疾病ID
      const cleanedId = this.cleanDiseaseId(diseaseId);
      this.log('info', `查询疾病 ${diseaseId} 的相似性, 标准化ID: ${cleanedId}, topN: ${topN}`);

      const isPlaceholderName = (name, id) => {
        if (!name) return true;
        const n = String(name).trim();
        if (!n) return true;
        if (n === id) return true;
        if (n === '未知') return true;
        if (/^\d+$/.test(n)) return true;
        if (/^disease\s+/i.test(n)) return true;
        if (/^disease\s*C\d+/i.test(n)) return true;
        return false;
      };
      
      // 生成缓存键
      const cacheKey = `disease_sim_${cleanedId}_${topN}`;
      
      // 检查缓存
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        this.log('info', `从缓存获取疾病 ${cleanedId} 的相似性`);
        return cachedData;
      }
      
      // 检查是否可以从文件获取
      try {
        const localFilePath = `server/saves/${encodeURIComponent(cleanedId)}-${topN}.json`;
        this.log('debug', `尝试从文件 ${localFilePath} 获取疾病相似性数据`);
      
        const response = await fetch(localFilePath);
        if (response.ok) {
          const result = await response.json();
          this.log('info', `从文件获取疾病 ${cleanedId} 的相似性, 共 ${result.length} 条记录`);
          
          // 查找目标疾病的索引
          const targetDiseaseIndex = result.findIndex(d => d.disease_id === cleanedId);
          
          let targetDisease = null;
          let relatedDiseases = [];
          
          if (targetDiseaseIndex !== -1) {
            targetDisease = { ...result[targetDiseaseIndex] };
            
            // 移除目标疾病，剩余的都是相关疾病
            relatedDiseases = result
              .filter((_, index) => index !== targetDiseaseIndex)
              .map(d => ({
                ...d,
                similarity: d.similarity || 0
              }));
            
            // 将相关疾病添加到目标疾病对象中
            targetDisease.related_diseases = relatedDiseases;
            this.log('info', `从文件缓存提取目标疾病 ${cleanedId} 的相关疾病数量: ${relatedDiseases.length}`);

            const badTarget = isPlaceholderName(targetDisease.name, cleanedId);
            const badRelatedCount = relatedDiseases.filter(d => isPlaceholderName(d.name, d.disease_id)).length;
            const total = relatedDiseases.length + 1;
            if (badTarget || badRelatedCount >= Math.ceil(total * 0.5)) {
              this.log('warn', `文件缓存名称信息质量过低(目标占位符=${badTarget}, 相关占位符=${badRelatedCount}/${relatedDiseases.length}), 忽略该文件缓存并改用API查询`);
              throw new Error(`文件缓存名称质量过低: ${cleanedId}`);
            }
          } else {
            this.log('warn', `文件缓存结果中未找到目标疾病 ${cleanedId}, 忽略该文件缓存并改用API查询`);
            throw new Error(`文件缓存不匹配目标疾病: ${cleanedId}`);
          }
          
          this.saveToCache(cacheKey, targetDisease);
          return targetDisease;
        }
      } catch (fileError) {
        // 本地文件不存在或读取出错，将继续使用API查询
        this.log('debug', `从文件获取疾病 ${cleanedId} 相似性数据失败, 将使用API查询: ${fileError.message}`);
      }
      
      this.log('info', `从API查询疾病 ${cleanedId} 的相似性, topN: ${topN}...`);
      const requestData = { 
        disease_id: cleanedId,
        top_n: topN
      };
      
      this.log('debug', `发送请求数据:`, requestData);
      const startTime = Date.now();
      const response = await apiClient.post('/query_disease', requestData);
      const endTime = Date.now();
      
      const result = response.data;
      this.log('info', `成功查询疾病 ${cleanedId} 的相似性, 响应时间: ${endTime - startTime}ms, 共返回 ${result.length} 个结果`);
      this.log('debug', `结果中前3个疾病:`, result.slice(0, 3));
      
      // 处理返回的结果，提取目标疾病和相关疾病
      const targetDiseaseIndex = result.findIndex(d => d.disease_id === cleanedId);
      
      let targetDisease = null;
      let relatedDiseases = [];
      
      if (targetDiseaseIndex !== -1) {
        targetDisease = { ...result[targetDiseaseIndex] };
        
        // 移除目标疾病，剩余的都是相关疾病
        relatedDiseases = result
          .filter((_, index) => index !== targetDiseaseIndex)
          .map(d => ({
            ...d,
            similarity: d.similarity || 0
          }));
        
        // 将相关疾病添加到目标疾病对象中
        targetDisease.related_diseases = relatedDiseases;
        this.log('info', `目标疾病 ${cleanedId} 的相关疾病数量: ${relatedDiseases.length}`);
      } else {
        this.log('warn', `查询结果中未找到目标疾病 ${cleanedId}, 终止并提示错误`);
        throw new Error(`API返回结果不包含目标疾病: ${cleanedId}`);
      }
      
      this.saveToCache(cacheKey, targetDisease);
      return targetDisease;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        diseaseId: cleanedId,
        topN: topN,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : '无响应数据'
      };
      
      this.log('error', `查询疾病 ${cleanedId} 相似性失败:`, errorDetails);
      throw new Error(`无法查询疾病相似性: ${error.message}`);
    }
  }

  /**
   * 设置API基础URL
   * @param {string} url 
   */
  setApiUrl(url) {
    this.apiUrl = url;
    apiClient.defaults.baseURL = url;
    this.log('info', `API基础URL已更新为: ${url}`);
  }

  /**
   * 设置请求超时时间
   * @param {number} timeout 超时时间（毫秒）
   */
  setTimeout(timeout) {
    apiClient.defaults.timeout = timeout;
    this.log('info', `API请求超时时间已更新为: ${timeout}ms`);
  }

  /**
   * 设置缓存超时时间
   * @param {number} timeout 缓存超时时间（毫秒）
   */
  setCacheTimeout(timeout) {
    this.cacheTimeout = timeout;
    this.log('info', `缓存超时时间已更新为: ${timeout}ms`);
  }

  /**
   * 通用GET请求方法
   * @param {string} endpoint API端点
   * @param {Object} params 查询参数
   * @returns {Promise<Object>} 响应数据
   */
  async get(endpoint, params = {}) {
    try {
      this.log('debug', `GET请求: ${endpoint}`, params);
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this.log('error', `GET请求失败: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * 通用POST请求方法
   * @param {string} endpoint API端点
   * @param {Object} data 请求体数据
   * @returns {Promise<Object>} 响应数据
   */
  async post(endpoint, data = {}) {
    try {
      this.log('debug', `POST请求: ${endpoint}`, data);
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.log('error', `POST请求失败: ${endpoint}`, error);
      throw error;
    }
  }

  // 从NCBI MedGen获取疾病详细信息
  async fetchDiseaseDetails(diseaseId) {
    try {
      if (!diseaseId) {
        throw new Error('疾病ID不能为空');
      }
      
      // 标准化疾病ID
      const cleanedId = this.cleanDiseaseId(diseaseId);
      this.log('info', `获取疾病详情: ${diseaseId}, 标准化ID: ${cleanedId}`);
      
      // 检查是否可以从本地文件获取详细信息
      try {
        // 尝试从server/saves目录读取疾病详细数据
        const localFilePath = `server/saves/${cleanedId}.json`;
        const response = await fetch(localFilePath);
        
        if (response.ok) {
          const data = await response.json();
          this.log('info', `从本地文件加载疾病 ${cleanedId} 详细数据成功`);
          
          // 检查语义类型数据
          if (data.attributes && data.attributes.semantictype) {
            this.log('debug', `从本地文件找到语义类型: ${data.attributes.semantictype}`);
          } else {
            this.log('warn', `从本地文件加载的疾病 ${cleanedId} 没有语义类型数据`);
          }
          
          return data;
        }
      } catch (fileError) {
        this.log('debug', `无法从本地文件加载疾病 ${cleanedId} 详细数据: ${fileError.message}`);
      }
      
      // 尝试从saves目录下搜索-20.json文件
      try {
        const localFilePath = `server/saves/${cleanedId}-20.json`;
        const response = await fetch(localFilePath);
        
        if (response.ok) {
          const dataArray = await response.json();
          if (Array.isArray(dataArray) && dataArray.length > 0) {
            // 查找主疾病数据
            const mainDisease = dataArray.find(d => d.disease_id === cleanedId) || dataArray[0];
            this.log('info', `从本地文件${localFilePath}加载疾病 ${cleanedId} 详细数据成功`);
            
            // 检查语义类型数据
            if (mainDisease.attributes && mainDisease.attributes.semantictype) {
              this.log('debug', `从本地文件找到语义类型: ${mainDisease.attributes.semantictype}`);
            } else {
              this.log('warn', `从本地文件加载的疾病 ${cleanedId} 没有语义类型数据`);
            }
            
            return mainDisease;
          }
        }
      } catch (fileError) {
        this.log('debug', `无法从本地-20.json文件加载疾病 ${cleanedId} 详细数据: ${fileError.message}`);
      }
      
      this.log('info', `从NCBI MedGen获取疾病 ${cleanedId} 的详细信息`);
      // 首先尝试从API获取详细信息
      const ncbiId = cleanedId.replace('C', '');
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=medgen&id=${ncbiId}&retmode=json`;
      this.log('debug', `NCBI请求URL: ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`NCBI MedGen API响应错误: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('info', `成功从NCBI获取疾病 ${cleanedId} 的详细信息, 响应时间: ${endTime - startTime}ms`);
      
      // 处理API返回的数据
      if (data.result && data.result[ncbiId]) {
        const medgenData = data.result[ncbiId];
        this.log('debug', '原始NCBI数据:', medgenData);
        
        // 提取并格式化有用的信息
        const formattedData = {
          name: medgenData.title || '',
          definition: medgenData.definition || '',
          attributes: {
            semantictype: medgenData.semantictype || '未知'
          }
        };
        
        this.log('debug', `NCBI返回的疾病 ${cleanedId} 格式化详情:`, formattedData);
        return formattedData;
      } else {
        this.log('warn', `NCBI MedGen API返回了无效的数据格式, 数据结构:`, data);
        return null;
      }
    } catch (error) {
      const errorDetails = {
        message: error.message,
        diseaseId: cleanedId,
        stack: error.stack
      };
      
      this.log('error', `获取疾病 ${cleanedId} 的NCBI详细信息时出错:`, errorDetails);
      // 如果出错，返回null而不是抛出异常，这样不会中断主流程
      return null;
    }
  }

  /**
   * 获取基因交互数据（已知+预测）
   * @param {string} diseaseId 疾病ID
   * @returns {Promise<Object>} 基因交互数据
   */
  async getGeneInteractions(diseaseId) {
    const cacheKey = `gene_interactions_${diseaseId}`;

    // 检查缓存
    if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < this.cacheTimeout)) {
      this.log('info', `从缓存获取基因交互数据: ${diseaseId}`);
      return this.cache[cacheKey].data;
    }

    try {
      this.log('info', `正在获取基因交互数据: ${diseaseId}`);
      const startTime = Date.now();

      const response = await this.get('/gene_interactions', {
        disease_id: this.cleanDiseaseId(diseaseId)
      });

      const loadTime = Date.now() - startTime;
      this.log('info', `基因交互数据加载完成，耗时: ${loadTime}ms`);

      // 缓存结果
      this.cache[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };

      return response;
    } catch (error) {
      this.log('error', `获取基因交互数据失败: ${diseaseId}`, error);
      throw error;
    }
  }

  /**
   * 比较两个疾病的多维相似度（HPO、miRNA、基因）
   * @param {string} diseaseId1 疾病1的ID
   * @param {string} diseaseId2 疾病2的ID
   * @returns {Promise<Object>} 三维度相似度数据
   */
  async compareDiseases(diseaseId1, diseaseId2) {
    const cacheKey = `compare_${diseaseId1}_${diseaseId2}`;

    // 检查缓存
    if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < this.cacheTimeout)) {
      this.log('info', `从缓存获取疾病对比数据: ${diseaseId1} vs ${diseaseId2}`);
      return this.cache[cacheKey].data;
    }

    try {
      this.log('info', `正在比较疾病: ${diseaseId1} vs ${diseaseId2}`);
      const startTime = Date.now();

      const response = await this.post('/compare_diseases', {
        id1: this.cleanDiseaseId(diseaseId1),
        id2: this.cleanDiseaseId(diseaseId2)
      });

      const loadTime = Date.now() - startTime;
      this.log('info', `疾病对比完成，耗时: ${loadTime}ms`);

      // 缓存结果
      this.cache[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };

      return response;
    } catch (error) {
      this.log('error', `疾病对比失败: ${diseaseId1} vs ${diseaseId2}`, error);
      throw error;
    }
  }

  /**
   * 获取智能药物重定位推荐
   * @param {string} diseaseId 疾病ID
   * @returns {Promise<Object>} 药物推荐数据
   */
  async getDrugRepositioning(diseaseId) {
    const cacheKey = `drug_repositioning_${diseaseId}`;

    // 检查缓存
    if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < this.cacheTimeout)) {
      this.log('info', `从缓存获取药物重定位数据: ${diseaseId}`);
      return this.cache[cacheKey].data;
    }

    try {
      this.log('info', `正在获取药物重定位推荐: ${diseaseId}`);
      const startTime = Date.now();

      const response = await this.post('/drug_repositioning', {
        disease_id: this.cleanDiseaseId(diseaseId)
      });

      const loadTime = Date.now() - startTime;
      this.log('info', `药物重定位推荐加载完成，耗时: ${loadTime}ms`);

      // 缓存结果
      this.cache[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };

      return response;
    } catch (error) {
      this.log('error', `获取药物重定位推荐失败: ${diseaseId}`, error);
      throw error;
    }
  }

  /**
   * 标准化疾病ID格式（确保是CXXXXXXX格式）
   * @param {string} diseaseId 原始疾病ID
   * @returns {string} 标准化的疾病ID
   */
  cleanDiseaseId(diseaseId) {
    if (!diseaseId) return '';

    let id = diseaseId.toString().trim();

    // 添加日志
    this.log('debug', `清理疾病ID: ${diseaseId}`);

    // 如果ID是纯数字，添加C前缀
    if (/^\d+$/.test(id)) {
      id = `C${id}`;
      this.log('debug', `为纯数字ID添加C前缀: ${id}`);
    }

    // 确保C大写
    if (id.startsWith('c')) {
      id = 'C' + id.substring(1);
      this.log('debug', `将小写c前缀转换为大写: ${id}`);
    }

    return id;
  }
}

// 创建单例实例
const newApiService = new NewApiService();

export default newApiService; 
