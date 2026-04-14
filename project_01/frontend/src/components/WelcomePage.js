import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button, Space, Tooltip, Card, Row, Col, List, Timeline, Divider, notification, Badge, Typography
} from 'antd';
import {
  NodeIndexOutlined, InteractionOutlined, BranchesOutlined, SlidersOutlined,
  PlayCircleOutlined, SearchOutlined, AppstoreOutlined, LinkOutlined,
  ExperimentOutlined, BarChartOutlined, ClockCircleOutlined, InfoCircleOutlined, 
  ApiOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import newApiService from '../utils/newApiService';
import '../App.css';

const { Text } = Typography;

/**
 * 欢迎页面组件
 * 显示系统介绍、功能特性和快速入门指南
 */
const WelcomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [diseaseCount] = useState(30170); // 从dis2id.txt获取的疾病数量
  const [geneCount] = useState(17247); // 从gene2id.txt获取的基因数量
  const [miRNACount] = useState(4797); // 从miRNA2id.txt获取的miRNA数量
  
  // API状态信息
  const [apiStatus, setApiStatus] = useState({
    type: 'loading',
    status: t('loading'),
    lastChecked: '-',
    responseTime: null,
    details: null
  });

  // 获取API状态和疾病数量
  useEffect(() => {
    fetchData();
  }, []);

  // 获取数据的函数
  const fetchData = async () => {
    try {
      const startTime = Date.now();
      const response = await newApiService.getApiStatus();
      const endTime = Date.now();
      
      if (response && response.status === 'ok') {
        setApiStatus({
          type: 'success',
          status: t('apiConnected'),
          lastChecked: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          responseTime: endTime - startTime,
          details: response
        });
        
        // 不再更新疾病数量，使用文件中的固定值
      } else {
        setApiStatus({
          type: 'warning',
          status: t('apiMockData'),
          lastChecked: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          responseTime: endTime - startTime,
          details: response
        });
        notification.warning({
          message: t('connectionError'),
          description: t('loadingError'),
          duration: 5
        });
      }
    } catch (error) {
      setApiStatus({
        type: 'error',
        status: t('apiDisconnected'),
        lastChecked: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        error: error.message,
        responseTime: null
      });
      notification.error({
        message: t('error'),
        description: error.message,
        duration: 5
      });
    }
  };

  // 处理开始探索按钮点击
  const handleStartExplore = () => {
    // 使用全局暴露的handleWelcomeContinue函数来处理路由导航
    if (window.handleWelcomeContinue) {
      window.handleWelcomeContinue();
    } else {
      // 如果全局函数不存在，则使用React Router的导航
      navigate('/app/search');
    }
  };
  
  // 功能列表
  const features = [
    {
      title: t('welcome.feature1Title'),
      description: t('welcome.feature1Desc'),
      icon: <NodeIndexOutlined />,
    },
    {
      title: t('welcome.feature2Title'),
      description: t('welcome.feature2Desc'),
      icon: <InteractionOutlined />,
    },
    {
      title: t('welcome.feature3Title'),
      description: t('welcome.feature3Desc'),
      icon: <BranchesOutlined />,
    },
    {
      title: t('welcome.feature4Title'),
      description: t('welcome.feature4Desc'),
      icon: <SlidersOutlined />,
    }
  ];

  // 快速开始步骤
  const steps = [
    {
      title: t('welcome.step1Title'),
      description: t('welcome.step1Desc'),
      icon: <SearchOutlined />,
    },
    {
      title: t('welcome.step2Title'),
      description: t('welcome.step2Desc'),
      icon: <AppstoreOutlined />,
    },
    {
      title: t('welcome.step3Title'),
      description: t('welcome.step3Desc'),
      icon: <LinkOutlined />,
    },
  ];

  // 装饰性圆圈
  const DecorativeCircle = ({ style }) => (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        background: 'rgba(92, 107, 192, 0.05)',
        ...style,
      }}
    />
  );

  // 渲染API状态详情
  const renderApiStatusDetails = () => {
    if (apiStatus.type === 'loading') {
      return <Text type="secondary">正在检查API状态...</Text>;
    }
    
    if (apiStatus.type === 'error') {
      return (
        <>
          <Text type="danger">API连接失败</Text>
          {apiStatus.error && <div><Text type="secondary">错误: {apiStatus.error}</Text></div>}
        </>
      );
    }
    
    return (
      <>
        <div>
          <Text type="secondary">
            <ClockCircleOutlined /> 响应时间: {apiStatus.responseTime ? `${apiStatus.responseTime}ms` : '未知'}
          </Text>
        </div>
        <div>
          <Text type="secondary">
            <InfoCircleOutlined /> 状态: {apiStatus.details?.status || '未知'}
          </Text>
        </div>
        {apiStatus.details?.model_available !== undefined && (
          <div>
            <Text type="secondary">
              模型状态: {apiStatus.details.model_available ? 
                <Badge status="success" text="可用" /> : 
                <Badge status="warning" text="不可用" />
              }
            </Text>
          </div>
        )}
        <div>
          <Text type="secondary">最后检查: {apiStatus.lastChecked}</Text>
        </div>
      </>
    );
  };

  return (
    <div className="welcome-container">
      <div className="welcome-theme">
        {/* 装饰性圆圈 */}
        <DecorativeCircle style={{ width: '300px', height: '300px', top: '10%', left: '-150px' }} />
        <DecorativeCircle style={{ width: '200px', height: '200px', top: '60%', right: '-100px' }} />
        <DecorativeCircle style={{ width: '150px', height: '150px', top: '30%', right: '10%' }} />
        
        <div className="welcome-content">
          <div className="animate-title">
            <h1 className="welcome-title">
              疾视
              <sup className="beta-tag">BETA</sup>
            </h1>
            <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
          </div>
          
          <Tooltip title={t('clickToExplore')}>
            <Button 
              type="primary" 
              size="large" 
              onClick={handleStartExplore} 
              className="welcome-button-large"
              icon={<PlayCircleOutlined />}
            >
              {t('welcome.startExplore')}
            </Button>
          </Tooltip>

          <div className="welcome-stats fade-in">
            <Tooltip title={
              <div style={{ maxWidth: '250px' }}>
                <div>{t('apiStatusTip')}</div>
                <Divider style={{ margin: '8px 0' }} />
                {renderApiStatusDetails()}
              </div>
            }>
              <div className="welcome-stat-card">
                <h3>API</h3>
                <Space>
                  <ExperimentOutlined style={{ fontSize: '24px', color: apiStatus.type === 'success' ? '#52c41a' : apiStatus.type === 'warning' ? '#faad14' : '#ff4d4f' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>{apiStatus.status}</span>
                </Space>
              </div>
            </Tooltip>
            
            <Tooltip title={t('diseasesAvailable')}>
              <div className="welcome-stat-card">
                <h3>{t('diseaseCount')}</h3>
                <Space>
                  <ApiOutlined style={{ fontSize: '24px', color: '#5c6bc0' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>{diseaseCount}</span>
                </Space>
              </div>
            </Tooltip>
            
            <Tooltip title={t('genesAvailable')}>
              <div className="welcome-stat-card">
                <h3>{t('geneCount')}</h3>
                <Space>
                  <NodeIndexOutlined style={{ fontSize: '24px', color: '#26d0ce' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>{geneCount}</span>
                </Space>
              </div>
            </Tooltip>
            
            <Tooltip title={t('miRNAsAvailable')}>
              <div className="welcome-stat-card">
                <h3>{t('miRNACount')}</h3>
                <Space>
                  <BarChartOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>{miRNACount}</span>
                </Space>
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="welcome-expanded-content">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card 
                title={t('welcome.features')} 
                variant="borderless" 
                className="welcome-features-card"
              >
                <List
                  itemLayout="horizontal"
                  dataSource={features}
                  renderItem={(item, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Tooltip title={`${t('featureTooltip')} ${index + 1}`}>
                            <div className="feature-avatar" style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20 }}>
                              {item.icon}
                            </div>
                          </Tooltip>
                        }
                        title={<div className="feature-title">{item.title}</div>}
                        description={<div className="feature-description">{item.description}</div>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title={t('welcome.quickStart')} 
                variant="borderless" 
                className="welcome-guide-card"
              >
                <Timeline
                  items={steps.map((step, index) => ({
                    key: index,
                    dot: (
                      <Tooltip title={`${t('stepTooltip')} ${index + 1}`}>
                        <div className="timeline-step-number">{index + 1}</div>
                      </Tooltip>
                    ),
                    children: (
                      <div className="timeline-step">
                        <div className="timeline-step-title">{step.title}</div>
                        <div className="timeline-step-description">{step.description}</div>
                      </div>
                    )
                  }))}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
      
      {/* 底部波浪效果 */}
      <div style={{ 
        position: 'relative', 
        height: '100px', 
        overflow: 'hidden',
        marginTop: '-40px'
      }}>
        <svg 
          viewBox="0 0 500 150" 
          preserveAspectRatio="none" 
          style={{ 
            height: '100%', 
            width: '100%',
            fill: '#F0F5FF'
          }}
        >
          <path 
            d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z" 
            style={{ 
              stroke: 'none'
            }}
          ></path>
        </svg>
      </div>
      
      {/* 页脚 */}
      <footer className="welcome-footer">
        <div className="welcome-footer-content">
          <div className="footer-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px' }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0066FF"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="footer-logo-text">疾视<sup className="beta-tag" style={{ fontSize: '8px', top: '-5px', padding: '1px 3px' }}>BETA</sup> - Disease Relationship Visualization</span>
          </div>
          <span className="welcome-footer-text">© 2025 疾视<sup className="beta-tag" style={{ fontSize: '8px', top: '-5px', padding: '1px 3px' }}>BETA</sup> 可视化平台</span>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage; 