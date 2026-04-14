import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 翻译资源
const resources = {
  en: {
    translation: {
      // 欢迎页面
      welcome: {
        title: 'Disease Similarity Visualization Platform',
        subtitle: 'Explore disease relationships through multi-modal complex networks',
        startExplore: 'Start Exploring',
        
        features: 'Platform Features',
        feature1Title: 'Disease Similarity Network',
        feature1Desc: 'Multi-modal disease similarity network based on shared genes and miRNAs, supporting up to 50 similar diseases',
        
        feature2Title: 'Interactive Data Exploration',
        feature2Desc: 'Interactive visualization of diseases, genes, and miRNAs with links to authoritative external databases',
        
        feature3Title: 'Customizable Similarity Threshold',
        feature3Desc: 'Adjustable similarity threshold to filter network relationships and precisely display connection strength',
        
        feature4Title: 'Molecular Marker Visualization',
        feature4Desc: 'Visual representation of disease-related genes and miRNAs for intuitive exploration',
        
        quickStart: 'Quick Start Guide',
        step1Title: 'Search for Diseases',
        step1Desc: 'Enter disease name or ID (e.g. C2265792) in the search bar, or select from example diseases',
        
        step2Title: 'Set Result Count',
        step2Desc: 'Configure the number of similar diseases to return (5-50), then click search to view related diseases',
        
        step3Title: 'Explore the Network',
        step3Desc: 'Click on nodes to view details, or click on genes/miRNAs to access external databases',
      },
      
      // 其他通用翻译
      'apiStatusTip': 'Current API connection status',
      'diseasesAvailable': 'Available diseases in database',
      'visualizationMethodsTip': 'Types of visualization methods',
      'platform.version': 'Platform Version 1.0',
      'clickToExplore': 'Click to start exploring disease relationships',
      'featureTooltip': 'Feature',
      'stepTooltip': 'Step',
      
      // 应用状态
      'apiConnected': 'API Connected',
      'apiDisconnected': 'API Disconnected',
      'apiMockData': 'Using Mock Data',
      'connectionError': 'Current data is simulated for demonstration. The actual API server is not connected.',
      'error': 'Data Loading Error',
      'loadingError': 'An error occurred loading data. Using mock data for demonstration.',
      
      // 主应用
      'diseaseMap': 'Disease Similarity Map',
      'diseaseDetails': 'Disease Details',
      'userManagement': 'User Management',
      'search': 'Disease Search',
      'selectDisease': 'Please select a disease first',
      'loading': 'Loading...',
      'logout': 'Logged Out',
      'logoutSuccess': 'You have successfully logged out of the system.',
      'home': 'Home',
      'profile': 'Profile',
      'settings': 'System Settings',
      'apiStatus': 'API Status',
      'diseaseCount': 'Diseases',
      'geneCount': 'Genes',
      'miRNACount': 'miRNAs',
      'genesAvailable': 'Available genes in database',
      'miRNAsAvailable': 'Available miRNAs in database',
      'visualizationTypes': 'Visualizations',
      
      // 其他翻译保持不变...
      'personalInfo': 'Personal Information',
      'accountSettings': 'Account Settings',
      'securitySettings': 'Security Settings',
      'preferences': 'Preferences',
      'searchHistory': 'Search History',
      'systemSettings': 'System Settings',
      'appearance': 'Appearance',
      'languageSettings': 'Language Settings',
      'notifications': 'Notifications',
      'dataSourceSettings': 'Data Source Settings',
      'apiConfiguration': 'API Configuration',
      'adminPanel': 'Admin Panel',
      'dataManagement': 'Data Management',
      'systemMonitor': 'System Monitor',
      'backupRestore': 'Backup & Restore',
      'help': 'Help & Support',
      
      // 新增功能翻译
      'guest': 'Guest',
      'close': 'Close',
      'role': 'Role',
      'lastLoginTime': 'Last Login Time',
      'themeMode': 'Theme Mode',
      'lightMode': 'Light Mode',
      'darkMode': 'Dark Mode',
      'language': 'Language',
      'clearHistory': 'Clear History',
      'view': 'View',
      'noHistory': 'No search history yet',
      'howToUse': 'How to Use',
      'helpStep1': 'Search for a disease using the search bar at the top of the page',
      'helpStep2': 'Explore the disease similarity network in the map view',
      'helpStep3': 'Click on a disease node to view detailed information',
      'helpStep4': 'View associated genes and miRNAs in the detail panel',
      'aboutSystem': 'About This System',
      'systemDescription': 'This is a disease similarity visualization system that helps researchers explore relationships between diseases based on shared genes and miRNAs.',
      'contactSupport': 'Contact Support',
      'supportInfo': 'For technical support, please contact: hjysir459@gmail.com',
      'historyClearedTitle': 'History Cleared',
      'historyCleared': 'Your search history has been cleared successfully',
      'diseaseNotFound': 'Disease Not Found',
      'diseaseNotFoundDesc': 'The selected disease could not be found in the current dataset',
      
      // 登录页面
      'loginTitle': 'Disease Similarity Visualization System',
      'loginSubtitle': 'Please login to access full functionality',
      'loginError': 'Login Error',
      'adminUsername': 'Admin username',
      'username': 'Username',
      'password': 'Password',
      'login': 'Login',
      'loginSuccess': 'Login Successful',
      'welcomeBack': 'Welcome back, {name}!',
      'regularUser': 'Regular User',
      'administrator': 'Administrator',
      'demoAccounts': 'Demo Accounts',
      'adminAccount': 'Admin Account',
      'userAccount': 'User Account'
    }
  },
  zh: {
    translation: {
      // 欢迎页面
      welcome: {
        title: '疾病相似性可视化平台',
        subtitle: '通过多模态复杂网络探索疾病间的关联关系',
        startExplore: '开始探索',
        
        features: '平台功能特性',
        feature1Title: '疾病相似性网络',
        feature1Desc: '基于共享基因和miRNA构建的多模态疾病相似性网络，支持最多50个相似疾病展示',
        
        feature2Title: '交互式数据探索',
        feature2Desc: '提供疾病、基因、miRNA三种节点交互，支持点击跳转到权威外部数据库查询',
        
        feature3Title: '相似度阈值调节',
        feature3Desc: '可调节相似度阈值，实时过滤网络关系，精确展示疾病间的关联强度',
        
        feature4Title: '分子标记可视化',
        feature4Desc: '提供分子标记可视化，直观展示疾病相关的基因和miRNA信息',
        
        quickStart: '快速入门指南',
        step1Title: '搜索疾病',
        step1Desc: '在搜索栏中输入疾病名称或ID（如C2265792），或从示例疾病中选择',
        
        step2Title: '设置结果数量',
        step2Desc: '设置返回的相似疾病数量(5-50)，点击搜索按钮查看相关疾病',
        
        step3Title: '探索网络关系',
        step3Desc: '在疾病网络中点击节点查看详情，或直接点击基因/miRNA跳转至外部数据库',
      },
      
      // 其他通用翻译
      'apiStatusTip': '当前API连接状态',
      'diseasesAvailable': '数据库中可用的疾病数量',
      'visualizationMethodsTip': '可视化方法种类',
      'platform.version': '平台版本 1.0',
      'clickToExplore': '点击开始探索疾病关系',
      'featureTooltip': '功能',
      'stepTooltip': '步骤',
      
      // 应用状态
      'apiConnected': 'API已连接',
      'apiDisconnected': 'API未连接',
      'apiMockData': '使用模拟数据',
      'connectionError': '当前使用的是模拟数据进行展示，实际API服务器未连接',
      'error': '数据加载异常',
      'loadingError': '加载数据时发生错误，将使用模拟数据进行展示',
      
      // 主应用
      'diseaseMap': '疾病相似性图谱',
      'diseaseDetails': '疾病详细信息',
      'userManagement': '用户管理',
      'search': '疾病查询',
      'selectDisease': '请先选择一个疾病',
      'loading': '加载中...',
      'logout': '已登出',
      'logoutSuccess': '您已成功登出系统',
      'home': '返回首页',
      'profile': '个人信息',
      'settings': '系统设置',
      'apiStatus': 'API状态',
      'diseaseCount': '疾病数量',
      'geneCount': '基因数量',
      'miRNACount': 'miRNA数量',
      'genesAvailable': '数据库中可用的基因数量',
      'miRNAsAvailable': '数据库中可用的miRNA数量',
      'visualizationTypes': '多模态复杂网络构建',
      
      // 其他翻译保持不变...
      'personalInfo': '个人信息',
      'accountSettings': '账号设置',
      'securitySettings': '安全设置',
      'preferences': '偏好设置',
      'searchHistory': '搜索历史',
      'systemSettings': '系统设置',
      'appearance': '外观设置',
      'languageSettings': '语言设置',
      'notifications': '通知设置',
      'dataSourceSettings': '数据源设置',
      'apiConfiguration': 'API配置',
      'adminPanel': '管理面板',
      'dataManagement': '数据管理',
      'systemMonitor': '系统监控',
      'backupRestore': '备份与恢复',
      'help': '帮助与支持',
      
      // 新增功能翻译
      'guest': '访客',
      'close': '关闭',
      'role': '角色',
      'lastLoginTime': '上次登录时间',
      'themeMode': '主题模式',
      'lightMode': '明亮模式',
      'darkMode': '暗黑模式',
      'language': '语言',
      'clearHistory': '清除历史记录',
      'view': '查看',
      'noHistory': '暂无搜索历史',
      'howToUse': '如何使用',
      'helpStep1': '使用页面顶部的搜索栏搜索疾病',
      'helpStep2': '在地图视图中探索疾病相似性网络',
      'helpStep3': '点击疾病节点查看详细信息',
      'helpStep4': '在详情面板中查看相关基因和miRNA',
      'aboutSystem': '关于本系统',
      'systemDescription': '这是一个疾病相似性可视化系统，能帮助研究人员根据共享基因和miRNA探索疾病之间的关系。',
      'contactSupport': '联系支持',
      'supportInfo': '如需技术支持，请联系：hjysir459@gmail.com',
      'historyClearedTitle': '历史记录已清除',
      'historyCleared': '您的搜索历史已成功清除',
      'diseaseNotFound': '未找到疾病',
      'diseaseNotFoundDesc': '在当前数据集中找不到所选疾病',
      
      // 登录页面
      'loginTitle': '疾病相似性可视化系统',
      'loginSubtitle': '请登录以访问完整功能',
      'loginError': '登录错误',
      'adminUsername': '管理员用户名',
      'username': '用户名',
      'password': '密码',
      'login': '登录',
      'loginSuccess': '登录成功',
      'welcomeBack': '欢迎回来，{name}！',
      'regularUser': '普通用户',
      'administrator': '管理员',
      'demoAccounts': '示例账号',
      'adminAccount': '管理员账号',
      'userAccount': '用户账号'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 