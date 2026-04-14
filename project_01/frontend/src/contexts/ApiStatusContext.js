import React, { createContext, useContext, useState, useEffect } from 'react';
import newApiService from '../utils/newApiService';

// 创建API状态上下文
const ApiStatusContext = createContext({
  connected: false,
  isMockData: false,
  lastChecked: null
});

// API状态提供者组件
export const ApiStatusProvider = ({ children }) => {
  const [apiStatus, setApiStatus] = useState({
    connected: false,
    isMockData: false,
    lastChecked: null
  });

  // 检查API状态
  const checkApiStatus = async () => {
    try {
      const status = await newApiService.checkApiStatus();
      setApiStatus({
        connected: status.connected,
        isMockData: status.isMockData || false,
        lastChecked: new Date()
      });
      return status;
    } catch (error) {
      console.error('检查API状态时发生错误:', error);
      setApiStatus({
        connected: false,
        isMockData: true,
        lastChecked: new Date(),
        error: error.message
      });
      return { connected: false, isMockData: true, error: error.message };
    }
  };

  // 组件挂载时检查API状态
  useEffect(() => {
    checkApiStatus();
    
    // 每隔2分钟检查一次API状态
    const intervalId = setInterval(checkApiStatus, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId); // 清理函数
  }, []);

  // 提供函数来刷新API状态
  const refreshApiStatus = () => {
    return checkApiStatus();
  };

  // 向子组件提供API状态和刷新函数
  return (
    <ApiStatusContext.Provider value={{ ...apiStatus, refreshApiStatus }}>
      {children}
    </ApiStatusContext.Provider>
  );
};

// 自定义Hook，用于获取API状态
export const useApiStatus = () => {
  const context = useContext(ApiStatusContext);
  if (context === undefined) {
    throw new Error('useApiStatus必须在ApiStatusProvider内部使用');
  }
  return context;
};

export default ApiStatusContext; 