// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Spin, Badge, notification, Button, Tabs, Switch, Card, Alert, Typography, Space, Avatar, Dropdown, Menu, Row, Col, List, Timeline, Modal, Divider, Radio, Form, Input, Empty, Select, InputNumber, Statistic, Slider, message, Descriptions, Tag, Tooltip } from 'antd';
import { InfoCircleOutlined, HomeOutlined, AppstoreOutlined, AimOutlined, TranslationOutlined, ApiOutlined, UserOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, SearchOutlined, NodeIndexOutlined, PieChartOutlined, LinkOutlined, QuestionCircleOutlined, BulbOutlined, FileTextOutlined, HistoryOutlined, DownOutlined, ExperimentOutlined, PartitionOutlined, DatabaseOutlined, RadarChartOutlined, MedicineBoxOutlined } from '@ant-design/icons';
// 新组件
import CustomLayout from './components/Layout';
import { useUIStore } from './store/uiStore';
import NewDiseaseSearchForm from './components/NewDiseaseSearchForm';
import CenteredDiseaseSearchForm from './components/CenteredDiseaseSearchForm';
import WelcomePage from './components/WelcomePage';
import NewDiseaseSimilarityGraph from './components/NewDiseaseSimilarityGraph';
import DiseaseSimilarityNetwork from './components/DiseaseSimilarityNetwork';
import DiseaseRadarComparison from './components/DiseaseRadarComparison';
import DrugRepositioningPanel from './components/DrugRepositioningPanel';
import Login from './components/Login';
import Register from './components/Register';
import UserAdmin from './components/UserAdmin';
import EmptyStateGuide from './components/EmptyStateGuide';
import NodeDetailCard from './components/NodeDetailCard';
import './App.css';
// 导入API服务
import newApiService from './utils/newApiService';
import { useTranslation } from 'react-i18next';
import { useApiStatus } from './contexts/ApiStatusContext';

const { Header, Content, Sider } = AntLayout;
const { TabPane } = Tabs;
const { Text } = Typography;

function App() {
  const { setIsLoading } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  // 状态变量
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [diseaseData, setDiseaseData] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [similarDiseases, setSimilarDiseases] = useState([]);
  const [networkData, setNetworkData] = useState(null);
  const [loadingText, setLoadingText] = useState('加载中...');
  const [globalGeneData, setGlobalGeneData] = useState([]);
  const [globalMiRNAData, setGlobalMiRNAData] = useState([]);
  const [globalDataLoaded, setGlobalDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // 新功能状态变量
  const [radarModalVisible, setRadarModalVisible] = useState(false);
  const [selectedCompareDisease, setSelectedCompareDisease] = useState(null);

  // 监听路由变化，同步activeTab
  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setActiveTab('home');
        break;
      case '/search':
        setActiveTab('1'); // 疾病查询
        break;
      case '/network':
        setActiveTab('3'); // 疾病相似性网络
        break;
      case '/history':
        setActiveTab('home');
        setShowHistoryModal(true); // 显示历史记录模态框
        break;
      case '/about':
        setActiveTab('home');
        setShowHelpModal(true); // 显示帮助模态框
        break;
      default:
        break;
    }
  }, [location.pathname]);

  // 用户相关状态
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { t, i18n } = useTranslation();
  
  // 新增状态变量
  const [themeMode, setThemeMode] = useState('light'); // 主题模式：light或dark
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // 新增系统设置相关状态
  const [networkSettings, setNetworkSettings] = useState({
    defaultSimilarityThreshold: 0.3,
    maxNodeCount: 100,
    defaultLayout: 'force',
    enableAnimation: true
  });
  
  const [interfaceSettings, setInterfaceSettings] = useState({
    tableRowsPerPage: 10,
    autoRefreshInterval: 0, // 0表示不自动刷新
    showDetailedTooltips: true
  });
  
  const [apiSettings, setApiSettings] = useState({
    apiUrl: '/api', // 改成相对路径，这样它才会走你配置的 proxy (5000端口)
    timeoutSeconds: 30,
    useLocalCache: true,
    cacheExpiryMinutes: 60
  });
    
  // 新增错误状态
  const [networkError, setNetworkError] = useState(null);

  // 新增返回标志
  const [isReturningToNetwork, setIsReturningToNetwork] = useState(false);

  // 初始化数据和检查用户登录状态
  useEffect(() => {
    // 检查是否已登录
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
      } catch (error) {
        console.error('解析用户信息错误:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    
    // 检查API连接并加载数据
    const initializeData = async () => {
      setLoading(true);
      console.log('开始检查API状态和初始化数据...');
      
      try {
        // 检查API连接状态 - 设置重试次数和超时时间
        let retryCount = 0;
        const maxRetries = 2;
        let apiStatus = null;
        
        while (retryCount <= maxRetries) {
          try {
            console.log(`尝试API连接 (尝试 ${retryCount + 1}/${maxRetries + 1})...`);
            apiStatus = await newApiService.initializeApi();
            
            if (apiStatus.connected) {
              console.log('API连接成功:', apiStatus);
              break; // 连接成功，跳出重试循环
            } else {
              console.log('API连接失败，准备重试...');
              retryCount++;
              if (retryCount <= maxRetries) {
                await new Promise(r => setTimeout(r, 1000)); // 等待1秒后重试
              }
            }
          } catch (error) {
            console.error('API连接尝试失败:', error);
            retryCount++;
            if (retryCount <= maxRetries) {
              await new Promise(r => setTimeout(r, 1000)); // 等待1秒后重试
            }
          }
        }
        
        // 设置API连接状态
        setApiConnected(apiStatus?.connected || false);
        setUsingMockData(apiStatus?.isMockData || false);
        
        // 如果API未连接，提早退出并显示错误
        if (!apiStatus?.connected) {
          setLoading(false);
          notification.error({
            message: t('apiConnectionError'),
            description: t('apiConnectionErrorDesc'),
            duration: 0
          });
          return;
        }
        
        // 继续加载数据
        try {
          console.log('开始获取疾病数据...');
        // 获取疾病数据
          const diseases = await newApiService.fetchDiseases();
          console.log(`成功获取${diseases.length}个疾病数据`);
        setDiseaseData(diseases);
        
        // 生成全局基因和miRNA数据
        generateGlobalData(diseases);
        } catch (error) {
          console.error('获取数据失败:', error);
          notification.error({
            message: t('dataLoadingError'),
            description: error.message || t('dataLoadingErrorDesc'),
            duration: 0
          });
        } finally {
          setLoading(false);
        }
        
      } catch (error) {
        console.error('初始化数据失败:', error);
        setApiConnected(false);
        setLoading(false);
        
        notification.error({
          message: t('error'),
          description: error.message || t('initializationError'),
          duration: 0,
          btn: (
            <Button type="primary" onClick={() => window.location.reload()}>
              {t('refreshPage')}
            </Button>
          )
        });
      }
    };
    
    initializeData();
  }, [t]);

  // 生成全局基因和miRNA数据的函数
  const generateGlobalData = (diseases) => {
    // 这里是模拟生成全局基因和miRNA数据
    // 在实际应用中，这些数据应该从API获取
    const genes = [];
    const mirnas = [];
    
    // 生成30个模拟基因
    for (let i = 0; i < 30; i++) {
      genes.push({
        id: `GENE${1000 + i}`,
        name: `Gene-${i+1}`,
        score: Math.random()
      });
    }
    
    // 生成20个模拟miRNA
    for (let i = 0; i < 20; i++) {
      mirnas.push({
        id: `miRNA${100 + i}`,
        name: `hsa-miR-${100 + i}`,
        score: Math.random()
      });
    }
    
    setGlobalGeneData(genes);
    setGlobalMiRNAData(mirnas);
    setGlobalDataLoaded(true);
  };

  // 处理欢迎页面的继续按钮
  const handleWelcomeContinue = () => {
    // 如果用户已登录，直接进入主应用
    if (currentUser) {
      navigate('/');
      setActiveTab('home');
    } else {
      // 否则进入登录页面
      navigate('/login');
    }
  };

  // 处理用户登录
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAdmin(user.role === 'admin');
    navigate('/');
    setActiveTab('home');
  };

  // 处理切换到注册界面
  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  // 处理切换到登录界面
  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  // 处理用户注册
  const handleRegister = (user) => {
    // 注册成功后自动切换到登录界面
    navigate('/login');
  };

  // 处理用户登出
  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsAdmin(false);
    navigate('/welcome');

    notification.success({
      message: t('logout'),
      description: t('logoutSuccess'),
      duration: 3
    });
  };

  // 切换主题模式
  const toggleTheme = (mode) => {
    setThemeMode(mode);
    // 应用主题样式
    document.body.className = mode === 'dark' ? 'dark-theme' : 'light-theme';
    // 保存用户偏好到localStorage
    localStorage.setItem('theme', mode);
  };
  
  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    toggleTheme(savedTheme);
  }, []);

  // 为欢迎页跳转添加全局接口
  useEffect(() => {
    // 将handleWelcomeContinue函数添加到window对象
    window.handleWelcomeContinue = handleWelcomeContinue;
    
    // 组件卸载时清理
    return () => {
      delete window.handleWelcomeContinue;
    };
  }, []);

  // 查看搜索历史记录
  const normalizeHistoryItem = (item) => {
    if (!item) return null;

    const id = (item.id || item.disease_id || item.diseaseId || '').toString().trim();
    const timestamp = item.timestamp || item.time || item.date || new Date().toISOString();
    const name = (item.name || item.disease_name || item.diseaseName || id).toString().trim();

    if (!id) return null;
    return { id, name, timestamp };
  };

  const isPlaceholderDiseaseName = (name, id) => {
    if (!name) return true;
    const trimmed = name.toString().trim();
    if (!trimmed) return true;
    if (trimmed === id) return true;
    if (/^\d+$/.test(trimmed)) return true;
    if (/^disease\s+/i.test(trimmed)) return true;
    if (/^unknown$/i.test(trimmed)) return true;
    return false;
  };

  const loadSearchHistory = () => {
    const raw = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const normalized = Array.isArray(raw)
      ? raw.map(normalizeHistoryItem).filter(Boolean)
      : [];

    setSearchHistory(normalized);
    return normalized;
  };
  
  // 记录搜索历史
  const recordSearchHistory = (disease) => {
    if (!disease) return;
    
    const history = loadSearchHistory();

    const cleanedId = newApiService.cleanDiseaseId(disease.disease_id || disease.id);
    const diseaseName = (disease.name || cleanedId).toString();

    if (!cleanedId) return;
    
    // 检查是否已存在相同记录
    const existingIndex = history.findIndex(item => item.id === cleanedId);
    if (existingIndex !== -1) {
      // 移除旧记录
      history.splice(existingIndex, 1);
    }
    
    // 添加新记录到最前面
    history.unshift({
      id: cleanedId,
      name: diseaseName,
      timestamp: new Date().toISOString()
    });
    
    // 限制历史记录数量为20条
    const limitedHistory = history.slice(0, 20);
    
    // 保存回localStorage
    localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
    setSearchHistory(limitedHistory);
    
    console.log(`已记录搜索历史: ${diseaseName} (${cleanedId})`);
  };
  
  // 清除搜索历史
  const clearSearchHistory = () => {
    localStorage.removeItem('searchHistory');
    setSearchHistory([]);
    notification.success({
      message: t('historyClearedTitle'),
      description: t('historyCleared'),
      duration: 3
    });
    setShowHistoryModal(false); // 关闭历史记录模态框
  };

  // 查看搜索历史
  const viewSearchHistory = () => {
    setShowHistoryModal(true);
  };

  // 从历史记录中选择疾病
  const selectDiseaseFromHistory = (diseaseId, topN = 20) => {
    if (!diseaseId) return;
    setLoading(true);
    handleDiseaseSelect(diseaseId, topN);
    setShowHistoryModal(false);
    setActiveTab('detail');
  };

  const refreshHistoryNames = async () => {
    const history = loadSearchHistory();
    if (!history.length) return;

    const diseaseNameById = new Map(diseaseData.map(d => [d.disease_id, d.name]));

    let changed = false;
    const nextHistory = [];

    for (const item of history) {
      const cleanedId = newApiService.cleanDiseaseId(item.id);

      let nextName = item.name;
      const fromList = diseaseNameById.get(cleanedId);
      if (fromList && !isPlaceholderDiseaseName(fromList, cleanedId)) {
        nextName = fromList;
      } else if (isPlaceholderDiseaseName(nextName, cleanedId)) {
        try {
          const details = await newApiService.fetchDiseaseDetails(cleanedId);
          if (details?.name && !isPlaceholderDiseaseName(details.name, cleanedId)) {
            nextName = details.name;
          }
        } catch (e) {
          // ignore
        }
      }

      if (cleanedId !== item.id || nextName !== item.name) {
        changed = true;
      }

      nextHistory.push({
        ...item,
        id: cleanedId,
        name: nextName
      });
    }

    if (!changed) return;

    localStorage.setItem('searchHistory', JSON.stringify(nextHistory));
    setSearchHistory(nextHistory);
  };

  useEffect(() => {
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (!showHistoryModal) return;
    void refreshHistoryNames();
  }, [showHistoryModal, diseaseData]);
  
  // 处理搜索操作
  const handleSearch = (results, topN = 20) => {
    console.log('搜索参数:', results, typeof results, topN);
    
    if (Array.isArray(results) && results.length > 0) {
      // 如果找到匹配结果，就使用第一个匹配结果
      const selectedDisease = results[0];
      console.log('搜索结果-数组:', selectedDisease);
      handleDiseaseSelect(selectedDisease.disease_id, topN);
    } else if (typeof results === 'string' && results.trim() !== '') {
      // 如果传入的是字符串（直接的疾病ID），就直接使用它
      console.log('搜索结果-字符串ID:', results);
      handleDiseaseSelect(results, topN);
    } else {
      console.warn('无效搜索结果:', results);
      message.warning('未找到匹配的疾病，请尝试其他搜索词');
    }
  };

  // 处理疾病选择
  const handleDiseaseSelect = async (diseaseId, topN = 20) => {
    try {
      if (!diseaseId) {
        message.error('无法查询疾病相似性: 疾病ID不能为空');
        return;
      }
      
      // 如果传入的是疾病对象而不是ID，提取ID
      const diseaseIdStr = typeof diseaseId === 'object' ? 
        (diseaseId.disease_id || diseaseId.id) : 
        diseaseId;
        
      console.log(`开始获取疾病相似性信息: ${diseaseIdStr}, topN: ${topN}`);
      setLoadingText('获取疾病相似性信息...');
      setLoading(true);
      
      // 获取疾病相似性数据
      const startTime = Date.now();
      const similarityData = await newApiService.queryDiseaseSimilarity(diseaseIdStr, topN);
      const endTime = Date.now();
      console.log(`API响应时间: ${endTime - startTime}ms`);
      
      if (!similarityData) {
        console.error(`获取疾病 ${diseaseIdStr} 相似性数据失败: 返回空数据`);
        message.error('未找到疾病相似性数据');
        setLoading(false);
        return;
      }
      
      // 处理API返回的数据
      let processedData = null;
      
      // 统一处理数组格式数据
      if (Array.isArray(similarityData)) {
        console.log(`疾病 ${diseaseIdStr} 使用数组格式数据，包含 ${similarityData.length} 个条目`);
        
        if (similarityData.length > 0) {
          // 第一个元素是主疾病数据
          processedData = { ...similarityData[0] };
          
          // 将数组中的其他疾病作为相关疾病
          if (similarityData.length > 1) {
            processedData.related_diseases = similarityData.slice(1).map(related => ({
              disease_id: related.disease_id,
              name: related.name || '未知',
              similarity: related.similarity || 0.5
            }));
      } else {
            processedData.related_diseases = [];
          }
        }
      } else {
        // 直接使用对象格式数据
        console.log(`疾病 ${diseaseIdStr} 使用对象格式数据`);
        processedData = { ...similarityData };
        
        // 确保相关疾病属性存在
        if (!processedData.related_diseases) {
          processedData.related_diseases = [];
        }
      }
      
      if (!processedData) {
        console.error(`处理疾病 ${diseaseIdStr} 数据失败: 格式不兼容`);
        message.error('处理疾病数据失败: 格式不兼容');
        setLoading(false);
        return;
      }

      // 确保必要的属性存在，避免空值错误
      if (!processedData.attributes) {
        processedData.attributes = {};
      }
      
      if (!processedData.attributes.associated_gene_names) {
        processedData.attributes.associated_gene_names = [];
      }
      
      if (!processedData.attributes.associated_miRNA_names) {
        processedData.attributes.associated_miRNA_names = [];
      }

      const diseaseNameById = new Map(diseaseData.map(d => [d.disease_id, d.name]));
      const resolveName = (did, currentName) => {
        const id = newApiService.cleanDiseaseId(did);
        const mapped = diseaseNameById.get(id);
        if (mapped && !isPlaceholderDiseaseName(mapped, id)) return mapped;
        if (currentName && !isPlaceholderDiseaseName(currentName, id)) return currentName;
        return mapped || currentName || id;
      };

      processedData.disease_id = newApiService.cleanDiseaseId(processedData.disease_id || diseaseIdStr);
      processedData.name = resolveName(processedData.disease_id, processedData.name);
      processedData.related_diseases = (processedData.related_diseases || []).map(d => {
        const did = newApiService.cleanDiseaseId(d.disease_id || d.id);
        return {
          ...d,
          disease_id: did,
          name: resolveName(did, d.name)
        };
      });
      
      // 详细记录获取到的数据
      console.log(`成功处理疾病 ${diseaseIdStr} 相似性数据:`, { 
        disease_id: processedData.disease_id,
        name: processedData.name || '未知',
        relatedDiseasesCount: processedData.related_diseases?.length || 0
      });

      // 尝试从API获取更详细的疾病信息
      try {
        console.log(`开始从NCBI获取疾病 ${diseaseIdStr} 详细信息...`);
        console.log('处理前的属性数据:', processedData.attributes);
        console.log('处理前的语义类型:', processedData.attributes?.semantictype);
        console.log('处理前的基因数据:', processedData.attributes?.associated_gene_names);
        console.log('处理前的miRNA数据:', processedData.attributes?.associated_miRNA_names);
        
        const detailStartTime = Date.now();
        const detailedInfo = await newApiService.fetchDiseaseDetails(diseaseIdStr);
        const detailEndTime = Date.now();
        
        if (detailedInfo) {
          console.log(`成功获取NCBI疾病详情，响应时间: ${detailEndTime - detailStartTime}ms`);
          console.log('NCBI返回的数据:', detailedInfo);
          
          // 保留原始数据中的重要字段
          const originalAttributes = { ...processedData.attributes };
          
          // 先检查detailedInfo是否本身就包含完整属性数据
          if (detailedInfo.attributes && 
              detailedInfo.attributes.associated_gene_names &&
              detailedInfo.attributes.associated_miRNA_names) {
            console.log('NCBI返回的数据包含完整属性，直接使用');
            
            // 如果是从本地文件加载的完整数据，直接使用它
            Object.assign(processedData, {
              name: detailedInfo.name && !isPlaceholderDiseaseName(detailedInfo.name, processedData.disease_id) ? detailedInfo.name : processedData.name,
              definition: detailedInfo.definition || processedData.definition,
              attributes: detailedInfo.attributes
            });
        } else {
            // 仅合并详细信息到主疾病对象，但不覆盖属性字段
            Object.assign(processedData, {
              name: detailedInfo.name && !isPlaceholderDiseaseName(detailedInfo.name, processedData.disease_id) ? detailedInfo.name : processedData.name,
              definition: detailedInfo.definition || processedData.definition
            });
            
            // 合并语义类型但保留其他属性
            if (detailedInfo.attributes && detailedInfo.attributes.semantictype) {
              processedData.attributes = {
                ...originalAttributes,
                semantictype: detailedInfo.attributes.semantictype
              };
            }
          }
          
          console.log('处理后的属性数据:', processedData.attributes);
          console.log('处理后的语义类型:', processedData.attributes?.semantictype);
          console.log('处理后的基因数据:', processedData.attributes?.associated_gene_names);
          console.log('处理后的miRNA数据:', processedData.attributes?.associated_miRNA_names);
        } else {
          console.warn(`未能从NCBI获取疾病 ${diseaseIdStr} 详细信息`);
        }
      } catch (error) {
        console.error(`获取NCBI详细疾病信息失败:`, error);
        // 不阻止主流程继续，只记录错误
      }
      
      // 设置应用状态
      setSimilarDiseases(processedData.related_diseases || []);
      setSelectedDisease(processedData);
      setActiveTab('2');
      
      // 记录搜索历史
      recordSearchHistory({
        id: processedData.disease_id,
        name: processedData.name || processedData.disease_id,
        timestamp: new Date().toISOString()
      });
      
      // 设置网络数据
      console.log(`生成疾病网络数据...`);
      const networkData = generateNetworkData(processedData);
      setNetworkData(networkData);
      console.log(`网络数据生成完成，节点数: ${networkData.nodes.length}, 边数: ${networkData.links.length}`);
      
      setLoading(false);
      
      // 显示成功消息
      message.success(`成功获取疾病 "${processedData.name || processedData.disease_id}" 的详细信息`);
    } catch (error) {
      const errorDetails = {
        message: error.message,
        diseaseId: typeof diseaseId === 'object' ? JSON.stringify(diseaseId) : diseaseId,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : '无响应'
      };
      
      console.error('获取疾病数据失败:', errorDetails);
      
      // 提供更具体的错误信息
      if (error.response) {
        // 有服务器响应的错误
        if (error.response.status === 400) {
          message.error(`请求格式错误: ${error.response.data?.message || '未知原因'}`);
        } else if (error.response.status === 404) {
          message.error(`未找到疾病 ID: ${typeof diseaseId === 'object' ? diseaseId.disease_id : diseaseId}`);
        } else if (error.response.status >= 500) {
          message.error(`服务器错误 (${error.response.status}): 请稍后再试`);
        } else {
          message.error(`API请求失败 (${error.response.status}): ${error.message}`);
        }
      } else if (error.request) {
        // 请求发出但没有收到响应
        message.error('服务器无响应: 请检查网络连接或服务器状态');
      } else {
        // 设置请求时发生的错误
        message.error(`获取疾病数据失败: ${error.message}`);
      }
      
      setLoading(false);
  }
  };

  // 生成API状态消息
  const getApiStatusMessage = () => {
    if (!apiConnected) {
      return t('apiDisconnected');
    }
    
    if (usingMockData) {
      return t('apiMockData');
    }
    
    return t('apiConnected');
  };
  
  // 生成API状态类型
  const getApiStatusType = () => {
    if (!apiConnected) {
      return "error";
    }
    
    if (usingMockData) {
      return "warning";
    }
    
    return "success";
  };
  
  // 用户下拉菜单 - 简化并添加功能
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={() => setShowProfileModal(true)}>
        个人信息
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />} onClick={() => setShowSettingsModal(true)}>
        系统设置
      </Menu.Item>
      {isAdmin && (
        <Menu.Item key="userManagement" icon={<TeamOutlined />} onClick={() => setActiveTab('admin')}>
          用户管理
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item key="help" icon={<QuestionCircleOutlined />} onClick={() => setShowHelpModal(true)}>
        帮助与支持
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  // 用户资料模态框
  const renderProfileModal = () => (
    <Modal
      title={t('profile')}
      visible={showProfileModal}
      onCancel={() => setShowProfileModal(false)}
      footer={[
        <Button key="close" onClick={() => setShowProfileModal(false)}>
          {t('close')}
        </Button>
      ]}
    >
      <div className="user-profile">
        <div className="profile-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: '16px' }} />
          <h2>{currentUser?.name || t('guest')}</h2>
          <p>{isAdmin ? t('administrator') : t('regularUser')}</p>
        </div>
        <Divider />
        <List>
          <List.Item>
            <List.Item.Meta
              avatar={<UserOutlined />}
              title={t('username')}
              description={currentUser?.username || '-'}
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              avatar={<FileTextOutlined />}
              title={t('role')}
              description={isAdmin ? t('administrator') : t('regularUser')}
            />
          </List.Item>
          <List.Item>
            <List.Item.Meta
              avatar={<HistoryOutlined />}
              title={t('lastLoginTime')}
              description={currentUser?.lastLogin || '-'}
            />
          </List.Item>
        </List>
      </div>
    </Modal>
  );
  
  // 更新设置模态框
  const renderSettingsModal = () => (
    <Modal
      title="系统设置"
      visible={showSettingsModal}
      onCancel={() => setShowSettingsModal(false)}
      width={500}
      footer={[
        <Button key="close" onClick={() => setShowSettingsModal(false)}>
          关闭
        </Button>
      ]}
    >
      <div className="system-settings">
        <Tabs defaultActiveKey="interface">
          <TabPane tab="界面设置" key="interface">
            <Form layout="vertical">
              <Form.Item label="主题模式">
                <Radio.Group 
                  value={themeMode} 
                  onChange={(e) => toggleTheme(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="light">明亮模式</Radio.Button>
                  <Radio.Button value="dark">暗黑模式</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane tab="网络可视化设置" key="network">
            <Form layout="vertical">
              <Form.Item label="默认相似度阈值">
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={networkSettings.defaultSimilarityThreshold}
                  onChange={(value) => setNetworkSettings({...networkSettings, defaultSimilarityThreshold: value})}
                  marks={{
                    0: '0',
                    0.3: '0.3',
                    0.5: '0.5',
                    0.7: '0.7',
                    1: '1'
                  }}
                />
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane tab="数据管理" key="data">
            <div className="data-management-section">
              <div className="data-info-card">
                <Statistic title="可用疾病总数" value={diseaseData.length || 0} />
                <Divider type="vertical" />
                <Statistic title="基因总数" value={17246} />
                <Divider type="vertical" />
                <Statistic title="miRNA总数" value={4797} />
              </div>
              
              <Alert
                message="数据缓存管理"
                description="清除本地缓存可能导致下次加载速度变慢，但可以确保获取最新数据。"
                type="info"
                showIcon
                style={{ marginTop: 20, marginBottom: 20 }}
              />
              
                <Button type="primary" danger onClick={() => {
                  localStorage.clear();
                  message.success('所有本地缓存数据已清除');
                }}>
                  清除所有缓存
                </Button>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
  
  // 帮助模态框
  const renderHelpModal = () => (
    <Modal
      title={t('help')}
      visible={showHelpModal}
      onCancel={() => setShowHelpModal(false)}
      footer={[
        <Button key="close" onClick={() => setShowHelpModal(false)}>
          {t('close')}
        </Button>
      ]}
      width={700}
    >
      <div className="help-content">
        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px' }}>使用页面顶部的搜索栏搜索疾病</h3>
        <p>在页面顶部的搜索框中输入疾病名称或ID，系统将自动匹配相关疾病。您也可以使用示例疾病进行快速开始。</p>

        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px', marginTop: '20px' }}>在地图视图中探索疾病相似性网络</h3>
        <p>疾病相似性网络将通过图形化方式展示疾病之间的关联关系：</p>
        <ul>
          <li><strong>节点大小</strong>：反映与目标疾病的相似度，节点越大表示相似度越高</li>
          <li><strong>连接类型</strong>：实线表示疾病与疾病之间的相似性关系或疾病与基因/miRNA的关联关系；虚线表示两个相关节点之间的相对关系</li>
          <li><strong>交互方式</strong>：您可以拖动、缩放、点击节点进行交互，鼠标悬停可查看详情</li>
          <li><strong>相似度阈值</strong>：通过调整滑块控制显示的相似度阈值，筛选更相关的疾病</li>
        </ul>

        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px', marginTop: '20px' }}>点击疾病节点查看详细信息</h3>
        <p>点击任何疾病节点可以导航至该疾病的详细信息页面，查看疾病的基本信息、定义、语义类型等内容。</p>

        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px', marginTop: '20px' }}>在详情面板中查看相关基因和miRNA</h3>
        <p>在疾病详情页面，您可以查看与该疾病相关的基因和miRNA列表，了解疾病的分子标记特征。</p>

        <Divider />

        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px' }}>{t('aboutSystem')}</h3>
        <p>本系统是一个基于多模态复杂网络构建的疾病相似性可视化平台，通过整合疾病、基因和miRNA数据，帮助研究人员探索疾病之间的潜在关联，发现生物标记物，进而推动疾病机制研究和药物研发。</p>
        <p>系统当前收录超过30,000种疾病，并提供丰富的交互式可视化工具，支持疾病网络分析和关联模式发现。</p>

        <Divider />

        <h3 style={{ color: '#1a2980', borderBottom: '2px solid #26d0ce', paddingBottom: '8px' }}>{t('contactSupport')}</h3>
        <p>{t('supportInfo')}</p>
      </div>
    </Modal>
  );

  // 渲染历史记录模态框
  const renderHistoryModal = () => {
    return (
      <Modal
        title="搜索历史"
        visible={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={[
          <Button key="clear" danger onClick={clearSearchHistory}>
            清空历史
          </Button>,
          <Button key="close" onClick={() => setShowHistoryModal(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {searchHistory.length > 0 ? (
          <List
            dataSource={searchHistory}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => {
                      setShowHistoryModal(false);
                      handleDiseaseSelect(item.id, 50);
                    }}
                  >
                    查看
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<HistoryOutlined style={{ fontSize: 20, color: '#3B82F6' }} />}
                  title={item.name}
                  description={`ID: ${item.id} | ${new Date(item.timestamp).toLocaleString()}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无搜索历史" />
        )}
      </Modal>
    );
  };
  

  
  // 添加首页导航函数
  const navigateToHome = () => {
    setActiveTab('home');
  };

  // 渲染主要内容 - 更新为使用新组件
  const renderContent = () => {
    // 加载中状态
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" tip="加载中..." />
        </div>
      );
    }

    // API未连接状态
    if (!apiConnected) {
      return (
        <EmptyStateGuide 
          type="api-error" 
          message="无法连接到后端API服务" 
          onRetry={handleRetryConnection}
        />
      );
    }

    // 首页内容
    if (activeTab === 'home') {
      return (
        <div className="home-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="module-title" style={{ display: 'inline-block' }}>工作台控制面板</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: -8 }}>欢迎使用病影药寻生物科技平台，请选择您要进行的操作</p>
          </div>

          <Row gutter={[40, 40]} justify="center" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Col xs={24} sm={12} lg={10}>
              <Card
                className="feature-card"
                hoverable
                cover={
                  <div className="card-icon-container" style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                    height: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                    <SearchOutlined style={{ fontSize: 64, color: 'white', zIndex: 1 }} />
                  </div>
                }
                onClick={() => navigate('/search')}
              >
                <div className="feature-title">疾病查询</div>
                <div className="feature-desc">通过疾病 ID 或名称搜索精准定位，设置相似度阈值</div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={10}>
              <Card
                className="feature-card"
                hoverable
                cover={
                  <div className="card-icon-container" style={{
                    background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                    height: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                    <NodeIndexOutlined style={{ fontSize: 64, color: 'white', zIndex: 1 }} />
                  </div>
                }
                onClick={() => navigate('/network')}
              >
                <div className="feature-title">疾病相似性网络</div>
                <div className="feature-desc">交互式探索疾病-基因-miRNA 三元关系知识图谱</div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={10}>
              <Card
                className="feature-card"
                hoverable
                cover={
                  <div className="card-icon-container" style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                    height: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }} />
                    <HistoryOutlined style={{ fontSize: 64, color: 'white', zIndex: 1 }} />
                  </div>
                }
                onClick={() => setShowHistoryModal(true)}
              >
                <div className="feature-title">历史记录</div>
                <div className="feature-desc">快速回顾过往查询记录，加速科研探索流程</div>
              </Card>
            </Col>

            {!isAdmin && (
              <Col xs={24} sm={12} lg={10}>
                <Card
                  className="feature-card"
                  hoverable
                  cover={
                    <div className="card-icon-container" style={{
                      background: 'linear-gradient(135deg, #60A5FA 0%, #93C5FD 100%)',
                      height: 160,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                      <BulbOutlined style={{ fontSize: 64, color: 'white', zIndex: 1 }} />
                    </div>
                  }
                  onClick={() => setShowHelpModal(true)}
                >
                  <div className="feature-title">关于</div>
                  <div className="feature-desc">获取系统操作帮助，了解可视化组件的交互方式</div>
                </Card>
              </Col>
            )}

            {isAdmin && (
              <Col xs={24} sm={12} lg={10}>
                <Card
                  className="feature-card"
                  hoverable
                  cover={
                    <div className="card-icon-container" style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                      height: 160,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                      <PartitionOutlined style={{ fontSize: 64, color: 'white', zIndex: 1 }} />
                    </div>
                  }
                  onClick={() => setActiveTab('admin')}
                >
                  <div className="feature-title">系统管理</div>
                  <div className="feature-desc">用户权限管理、系统状态监控与数据维护</div>
                </Card>
              </Col>
            )}
          </Row>
        </div>
      );
    }

    // 疾病详情内容
    if (activeTab === '2') {
      if (!selectedDisease) {
        return (
          <div className="disease-detail-empty">
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                <span>
                  请先通过<a href="#" onClick={() => setActiveTab('1')}>疾病查询</a>搜索疾病
                </span>
              }
            />
          </div>
        );
      }
      
      return (
        <div className="disease-detail-content">
          <Card
            title={<div className="disease-detail-title">{selectedDisease.name || selectedDisease.disease_id}</div>}
            className="disease-detail-card"
            variant="borderless"
            extra={
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<SearchOutlined />}
                  onClick={() => setActiveTab('1')}
                >
                  返回搜索
                </Button>
              </Space>
            }
          >
            <Tabs defaultActiveKey="overview">
              <TabPane tab="概览" key="overview">
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <div className="disease-info-section">
                      <h3 className="section-title">基本信息</h3>
                      <Descriptions bordered size="small">
                        <Descriptions.Item label="疾病ID" span={3}>
                          <Tag color="blue">{selectedDisease.disease_id}</Tag>
                      </Descriptions.Item>
                        <Descriptions.Item label="疾病名称" span={3}>
                          {selectedDisease.name || "未知"}
                      </Descriptions.Item>
                        <Descriptions.Item label="定义" span={3}>
                          {selectedDisease.definition || "暂无定义信息"}
                      </Descriptions.Item>
                        <Descriptions.Item label="语义类型" span={3}>
                          {selectedDisease.attributes?.semantictype || "未知"}
                        </Descriptions.Item>
                        <Descriptions.Item label="外部链接" span={3}>
                          <Button
                            type="link"
                            icon={<LinkOutlined />}
                            href={`https://www.ncbi.nlm.nih.gov/medgen/${selectedDisease.disease_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            NCBI MedGen
                          </Button>
                      </Descriptions.Item>
                    </Descriptions>
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div className="disease-molecular-section">
                      <h3 className="section-title">分子标记</h3>
                      <Card type="inner" title="相关基因" size="small">
                        <div className="gene-list">
                          {selectedDisease.attributes?.associated_gene_names?.length > 0 ? (
                            <Space wrap>
                              {selectedDisease.attributes.associated_gene_names.map((gene, index) => (
                                <Tag
                                  key={index}
                                  color="green"
                                  onClick={() => window.open(`https://www.ncbi.nlm.nih.gov/gene/${gene}`, '_blank')}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {gene}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关基因数据" />
                          )}
                        </div>
                  </Card>

                      <Card type="inner" title="相关miRNA" size="small" style={{ marginTop: 16 }}>
                        <div className="mirna-list">
                          {selectedDisease.attributes?.associated_miRNA_names?.length > 0 ? (
                            <Space wrap>
                              {selectedDisease.attributes.associated_miRNA_names.map((mirna, index) => {
                                // 根据miRNA ID前缀确定正确的链接
                                let mirnaUrl = '';
                                if (mirna.startsWith('hsa-') || mirna.startsWith('mmu-') || mirna.startsWith('rno-')) {
                                  // 使用mirBase的正确查询结果URL
                                  mirnaUrl = `https://mirbase.org/results/?query=${encodeURIComponent(mirna)}`;
                                } else {
                                  // 其他miRNA，使用miRDB搜索
                                  mirnaUrl = `http://mirdb.org/cgi-bin/search.cgi?searchType=miRNA&searchBox=${encodeURIComponent(mirna)}`;
                                }

                                return (
                                  <Tag
                                    key={index}
                                    color="purple"
                                    onClick={() => window.open(mirnaUrl, '_blank')}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {mirna}
                                  </Tag>
                                );
                              })}
                            </Space>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关miRNA数据" />
                          )}
                        </div>
                      </Card>
                    </div>
                </Col>
              </Row>
              </TabPane>

              <TabPane tab="相关疾病" key="related">
                {similarDiseases && similarDiseases.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {similarDiseases.map((item, index) => {
                      const similarity = item.similarity * 100;

                      const tooltipContent = (
                        <div style={{
                          padding: '20px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          borderRadius: '16px',
                          backdropFilter: 'blur(20px)',
                          border: '2px solid #3B82F6',
                          boxShadow: '0 12px 40px rgba(59, 130, 246, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
                        }}>
                          {/* 顶部装饰线 */}
                          <div style={{
                            height: '4px',
                            background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                            marginBottom: '14px',
                            borderRadius: '2px'
                          }} />

                          {/* 疾病名称 */}
                          <div style={{
                            marginBottom: '14px'
                          }}>
                            <div style={{
                              fontSize: '16px',
                              color: '#3B82F6',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{
                                width: '4px',
                                height: '4px',
                                background: '#3B82F6',
                                borderRadius: '50%'
                              }} />
                              疾病名称
                            </div>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#1e40af',
                              lineHeight: '1.5'
                            }}>
                              {item.name}
                            </div>
                          </div>

                          {/* 分割线 */}
                          <div style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                            marginBottom: '16px'
                          }} />

                          {/* 相似度 */}
                          <div style={{
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{
                                fontSize: '16px',
                                color: '#3B82F6',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginBottom: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{
                                  width: '4px',
                                  height: '4px',
                                  background: '#3B82F6',
                                  borderRadius: '50%'
                                }} />
                                相似度
                              </div>
                              <div style={{
                                fontSize: '20px',
                                fontWeight: 900,
                                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              }}>
                                {similarity.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          {/* 分割线 */}
                          <div style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                            marginBottom: '16px'
                          }} />

                          {/* 定义 */}
                          <div>
                            <div style={{
                              fontSize: '16px',
                              color: '#3B82F6',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{
                                width: '4px',
                                height: '4px',
                                background: '#3B82F6',
                                borderRadius: '50%'
                              }} />
                              定义
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: '#1e40af',
                              lineHeight: '1.6',
                              maxHeight: '100px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              padding: '12px 14px',
                              background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%)',
                              borderRadius: '8px',
                              border: '1.5px solid #bfdbfe'
                            }}>
                              {item.definition || '暂无定义信息'}
                            </div>
                          </div>
                        </div>
                      );

                      return (
                        <Tooltip
                          key={index}
                          title={tooltipContent}
                          placement="top"
                          overlayStyle={{
                            maxWidth: '380px'
                          }}
                          overlayInnerStyle={{
                            padding: '0',
                            background: 'transparent',
                            boxShadow: 'none'
                          }}
                        >
                          <div
                            style={{
                              padding: '24px',
                              background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%)',
                              border: '2px solid #d4e6f7',
                              borderRadius: '16px',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
                            }}
                            onClick={() => handleDiseaseSelect(item.disease_id, 50)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.2)';
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.borderColor = '#3B82F6';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #e6f2ff 0%, #d4e6f7 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.08)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.borderColor = '#d4e6f7';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%)';
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '20px'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: 700,
                                  color: '#1e40af',
                                  marginBottom: '8px',
                                  transition: 'color 0.3s'
                                }}>
                                  {item.name}
                                </div>
                                <div style={{
                                  fontSize: '13px',
                                  color: '#3b82f6',
                                  fontFamily: 'monospace',
                                  letterSpacing: '0.5px',
                                  fontWeight: 600
                                }}>
                                  ID: {item.disease_id}
                                </div>
                              </div>
                              <Button
                                type="primary"
                                size="large"
                                icon={<RadarChartOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCompareDisease(item);
                                  setRadarModalVisible(true);
                                }}
                                style={{
                                  marginLeft: '20px',
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                  border: 'none',
                                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                }}
                              >
                                对比分析
                              </Button>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '20px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '6px',
                                minWidth: '140px',
                                paddingBottom: '2px'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  color: '#475569',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  相似度
                                </span>
                                <span style={{
                                  fontSize: '20px',
                                  fontWeight: 900,
                                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                  lineHeight: '1'
                                }}>
                                  {similarity.toFixed(1)}
                                </span>
                                <span style={{
                                  fontSize: '16px',
                                  color: '#3B82F6',
                                  fontWeight: 700,
                                  lineHeight: '1'
                                }}>
                                  %
                                </span>
                              </div>

                              <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '16px',
                                paddingBottom: '7px'
                              }}>
                                <div style={{
                                  flex: 1,
                                  height: '10px',
                                  background: 'linear-gradient(90deg, #e0e7ff 0%, #dbeafe 100%)',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${similarity}%`,
                                    background: `linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)`,
                                    borderRadius: '6px',
                                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: `0 0 16px rgba(59, 130, 246, 0.5)`
                                  }} />
                                </div>
                                <div style={{
                                  fontSize: '16px',
                                  color: '#1e40af',
                                  fontWeight: 800,
                                  minWidth: '50px',
                                  textAlign: 'right',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  lineHeight: '1'
                                }}>
                                  {similarity > 70 ? '极高' : similarity > 50 ? '高' : similarity > 30 ? '中' : '低'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description="暂无相关疾病数据" />
                )}
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <MedicineBoxOutlined />
                    AI药物推荐
                    <Tag color="blue" style={{ marginLeft: 8 }}>AI</Tag>
                  </span>
                }
                key="drugs"
              >
                <DrugRepositioningPanel diseaseId={selectedDisease.disease_id} />
              </TabPane>
            </Tabs>
          </Card>

          <Modal
            title="疾病多维对比"
            open={radarModalVisible}
            onCancel={() => setRadarModalVisible(false)}
            footer={null}
            width={800}
          >
            {selectedCompareDisease && (
              <DiseaseRadarComparison
                disease1={selectedDisease}
                disease2={selectedCompareDisease}
              />
            )}
          </Modal>
        </div>
      );
    }

    // 疾病相似性网络内容
    if (activeTab === '3') {
      if (!selectedDisease) {
        return (
          <div className="disease-network-empty">
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                <span>
                  请先通过<a href="#" onClick={() => setActiveTab('1')}>疾病查询</a>搜索疾病
                </span>
              }
            />
          </div>
        );
      }
      
      return (
        <DiseaseSimilarityNetwork
          targetDisease={selectedDisease}
          similarDiseases={similarDiseases}
          onNodeClick={handleDiseaseSelect}
          loading={loading}
        />
      );
    }

    // 渲染APP的主体内容
    return (
      <div className="main-content">
        {/* 疾病查询 */}
        {activeTab === "1" && (
          <div className="disease-search-content">
            <Row justify="center" align="middle">
              <Col xs={24} sm={22} md={20} lg={16} xl={14}>
                <div style={{ margin: '40px 0', textAlign: 'center' }}>
                <CenteredDiseaseSearchForm 
                  diseaseData={diseaseData}
                  onSearch={handleSearch} 
                  loading={loading}
                />
                </div>
                
                {searchResults && searchResults.length > 0 && (
                  <Card 
                    title={<div style={{ fontWeight: 'bold', fontSize: '18px' }}>搜索结果</div>}
                    className="search-results-card"
                    style={{ marginTop: '20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  >
                    <List
                      itemLayout="horizontal"
                      dataSource={searchResults}
                      renderItem={item => (
                        <List.Item
                          actions={[
                            <Button 
                              type="primary"
                              shape="round" 
                              onClick={() => handleDiseaseSelect(item.disease_id, 50)}
                              icon={<InfoCircleOutlined />}
                            >
                              查看详情
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<Badge status="processing" style={{ backgroundColor: '#1a2980' }} />}
                            title={<span style={{ fontWeight: 'bold' }}>{item.name}</span>}
                            description={<span style={{ color: '#666' }}>ID: {item.disease_id}</span>}
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </Col>
            </Row>
          </div>
        )}
        
        {/* 管理员页面，保留 */}
        {activeTab === "admin" && isAdmin && (
          <UserAdmin />
        )}
      </div>
    );
  };

  // 重试API连接 - 修改为使用新API服务
  const handleRetryConnection = async () => {
    notification.info({
      message: "正在重试连接",
      description: "正在尝试重新连接到API服务...",
      duration: 2
    });
    
    try {
      // 清除所有现有错误状态
      setNetworkError(null);
      
      // 尝试重新初始化API
      const apiStatusResult = await newApiService.checkApiStatus();
      
      if (apiStatusResult.connected) {
        notification.success({
          message: "连接成功",
          description: "已成功连接到API服务",
          duration: 3
        });
        
        // 更新API连接状态
        setApiConnected(true);
        setUsingMockData(apiStatusResult.isMockData);
        
        // 如果之前有选中的疾病，尝试重新加载详情
        if (selectedDisease) {
          loadDiseaseDetail(selectedDisease.disease_id, 50);
        }
        
        // 如果没有加载过疾病数据，重新加载
        if (diseaseData.length === 0) {
          try {
            const diseases = await newApiService.fetchDiseases();
            setDiseaseData(diseases);
            generateGlobalData(diseases);
          } catch (fetchError) {
            console.error('重新获取疾病数据失败:', fetchError);
          }
        }
      } else {
        notification.error({
          message: "连接失败",
          description: apiStatusResult.message || "无法连接到API服务，请检查网络连接",
          duration: 4
        });
        
        // 更新API连接状态
        setApiConnected(false);
        setUsingMockData(true);
      }
    } catch (error) {
      console.error('API重连失败:', error);
      
      notification.error({
        message: "连接错误",
        description: error.message || "重新连接过程中发生未知错误",
        duration: 4
      });
      
      // 更新错误状态
      setNetworkError(error.message || "API连接失败");
      setApiConnected(false);
      setUsingMockData(true);
    }
  };
  
  // 加载疾病详情的独立函数 - 修改为使用新API服务
  const loadDiseaseDetail = async (diseaseId, topN = 50) => {
    if (!diseaseId) return;
    
    setLoading(true);
    try {
      console.log(`获取疾病详情: ${diseaseId}, topN: ${topN}`);
      
      const detailData = await newApiService.queryDiseaseSimilarity(diseaseId, topN);
      
      if (!detailData) {
        console.error(`获取疾病 ${diseaseId} 详情时返回空数据`);
        message.error(`获取疾病 ${diseaseId} 详情失败: 返回空数据`);
        setLoading(false);
        return;
      }
      
      console.log(`成功获取疾病 ${diseaseId} 详情数据`, {
        disease: detailData.disease_id,
        name: detailData.name,
        relatedCount: detailData.related_diseases ? detailData.related_diseases.length : 0
      });
      
      setSelectedDisease(detailData);
      setActiveTab('2');
      
      // 设置网络数据
      const networkData = generateNetworkData(detailData);
      setNetworkData(networkData);
      
      setLoading(false);
    } catch (error) {
      console.error(`获取疾病 ${diseaseId} 详情时出错:`, error);
      const errorMessage = error.message || '未知错误';
      message.error(`获取疾病 ${diseaseId} 详情失败: ${errorMessage}`);
      setLoading(false);
      
      // 检查是否是网络错误或API错误
      if (error.message.includes('Network Error') || error.response?.status >= 500) {
        // 服务器错误，可能需要重试
        message.warning('服务器连接问题，可尝试刷新页面或稍后再试');
      } else if (error.response?.status === 400) {
        // 请求格式错误
        message.warning('请求格式错误，请检查疾病ID格式');
      } else if (error.response?.status === 404) {
        // 找不到疾病
        message.warning(`找不到ID为 ${diseaseId} 的疾病，请检查ID是否正确`);
      }
    }
  };

  // 生成网络图数据
  const generateNetworkData = (similarityData) => {
    try {
      console.log(`开始生成网络图数据...`);
      
      if (!similarityData) {
        console.warn(`生成网络图数据失败: similarityData为空`);
          return { nodes: [], links: [] };
        }
        
        const nodes = [];
        const links = [];
      const mainDiseaseId = similarityData.disease_id;
        
      if (!mainDiseaseId) {
          console.warn(`生成网络图数据失败: 主疾病ID缺失`);
          return { nodes: [], links: [] };
        }
        
        // 添加主节点
        nodes.push({
          id: mainDiseaseId,
          name: similarityData.name || similarityData.chinese_name || `疾病 ${mainDiseaseId}`,
          value: 20, // 主节点更大
          category: 0, // 主疾病为类别0
          itemStyle: {
            color: '#e74c3c'
          }
        });
        
        // 添加相关疾病节点
      const relatedDiseases = similarityData.related_diseases || [];
      
        relatedDiseases.forEach((disease) => {
          if (!disease.disease_id) {
            console.warn(`跳过没有disease_id的相关疾病数据:`, disease);
            return;
          }
          
          nodes.push({
            id: disease.disease_id,
            name: disease.name || disease.chinese_name || `疾病 ${disease.disease_id}`,
            value: Math.max(10, (disease.similarity || 0.5) * 15),
            category: 1, // 相关疾病为类别1
            itemStyle: {
              color: '#3498db'
            }
          });
          
          // 添加与主节点的连接
          links.push({
            source: mainDiseaseId,
            target: disease.disease_id,
            value: disease.similarity || 0.5, // 如果没有相似度值，使用默认值
            lineStyle: {
              width: (disease.similarity || 0.5) * 3
            }
          });
        });
        
        console.log(`成功生成网络图数据，节点数: ${nodes.length}, 连接数: ${links.length}`);
        return { nodes, links };
    } catch (error) {
      console.error(`生成网络图数据时出错:`, error);
      console.error(`错误数据:`, similarityData);
      
      // 返回空数据而不是null，避免渲染错误
      return { nodes: [], links: [] };
    }
  };

  // 使用路由渲染不同的界面
  return (
    <Routes>
      {/* 欢迎页 */}
      <Route path="/welcome" element={<WelcomePage />} />

      {/* 登录页 */}
      <Route path="/login" element={<Login onLogin={handleLogin} onSwitchToRegister={handleSwitchToRegister} />} />

      {/* 注册页 */}
      <Route path="/register" element={<Register onRegister={handleRegister} onBackToLogin={handleSwitchToLogin} />} />

      {/* 主应用 - 需要登录才能访问 */}
      <Route path="/*" element={
        currentUser ? (
          <CustomLayout>
            <div className="content-container">
              {renderContent()}
            </div>

            {/* 添加模态框 */}
            {renderProfileModal()}
            {renderSettingsModal()}
            {renderHelpModal()}
            {renderHistoryModal()}
          </CustomLayout>
        ) : (
          // 未登录则重定向到欢迎页
          <WelcomePage />
        )
      } />
    </Routes>
  );
}

export default App; 
