import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Card, List, Timeline, Tooltip, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  NodeIndexOutlined,
  SearchOutlined,
  AppstoreOutlined,
  InteractionOutlined,
  LinkOutlined,
  ExperimentOutlined,
  SlidersOutlined,
  BarChartOutlined,
  BranchesOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import '../App.css';
// import { getRealDiseases } from '../utils/MockDataProvider';
import apiService from '../utils/apiService';

const WelcomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [diseaseCount] = useState('31710'); // 固定疾病数量为31710
  const [apiStatus, setApiStatus] = useState({ status: 'loading', type: 'default' });

  // 获取API状态
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 检查API状态
        const apiStatusResult = await apiService.checkApiStatus();
        let statusText = t('apiConnected');
        let statusType = 'success';
        
        if (!apiStatusResult.connected) {
          statusText = t('apiDisconnected');
          statusType = 'error';
        } else if (apiStatusResult.isMockData) {
          statusText = t('apiMockData');
          statusType = 'warning';
        }
        
        setApiStatus({ status: statusText, type: statusType });
        
        // 不再获取疾病数量，使用固定值31710
      } catch (error) {
        console.error('获取状态信息失败:', error);
        setApiStatus({ status: t('apiDisconnected'), type: 'error' });
      }
    };
    
    fetchData();
  }, [t]);

  const handleStartExplore = () => {
    // 如果传入了onWelcomeContinue回调函数，则调用它
    if (window.parent && window.parent.handleWelcomeContinue) {
      window.parent.handleWelcomeContinue();
    } else {
      // 否则，尝试使用路由导航到/app路径
      navigate('/app');
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

  return (
    <div className="welcome-container">
      <div className="welcome-theme">
        {/* 装饰性圆圈 */}
        <DecorativeCircle style={{ width: '300px', height: '300px', top: '10%', left: '-150px' }} />
        <DecorativeCircle style={{ width: '200px', height: '200px', top: '60%', right: '-100px' }} />
        <DecorativeCircle style={{ width: '150px', height: '150px', top: '30%', right: '10%' }} />
        
        <div className="welcome-content">
          <div className="animate-title">
            <h1 className="welcome-title">病影药寻</h1>
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
            <Tooltip title={t('apiStatusTip')}>
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
                  <BarChartOutlined style={{ fontSize: '24px', color: '#5c6bc0' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>{diseaseCount}</span>
                </Space>
              </div>
            </Tooltip>
            
            <Tooltip title={t('visualizationMethodsTip')}>
              <div className="welcome-stat-card">
                <h3>{t('visualizationTypes')}</h3>
                <Space>
                  <BranchesOutlined style={{ fontSize: '24px', color: '#5c6bc0' }} />
                  <span style={{ fontSize: '20px', fontWeight: '600' }}>4</span>
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
                bordered={false} 
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
                bordered={false} 
                className="welcome-guide-card"
              >
                <Timeline>
                  {steps.map((step, index) => (
                    <Timeline.Item 
                      key={index} 
                      dot={
                        <Tooltip title={`${t('stepTooltip')} ${index + 1}`}>
                          <div className="timeline-step-number">{index + 1}</div>
                        </Tooltip>
                      }
                    >
                      <div className="timeline-step">
                        <div className="timeline-step-title">{step.title}</div>
                        <div className="timeline-step-description">{step.description}</div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
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
            fill: '#333'
          }}
        >
          <path 
            d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,150.00 L0.00,150.00 Z" 
            style={{ 
              stroke: 'none',
              fill: '#333' 
            }}
          />
        </svg>
      </div>
      
      <div className="welcome-footer">
        <div className="welcome-footer-content">
          <div className="footer-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px' }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#26d0ce"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#26d0ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="footer-logo-text">病影药寻 - Disease Relationship Visualization</span>
          </div>
          <span className="welcome-footer-text">© 2025 病影药寻可视化平台</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 