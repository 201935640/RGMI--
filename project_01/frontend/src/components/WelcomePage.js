import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button, Space, Tooltip, Row, Col, notification, Badge, Typography
} from 'antd';
import {
  NodeIndexOutlined, InteractionOutlined, BranchesOutlined, SlidersOutlined,
  PlayCircleOutlined, SearchOutlined, PartitionOutlined, ApiOutlined,
  ExperimentOutlined, ClockCircleOutlined, InfoCircleOutlined,
  DatabaseOutlined, BulbOutlined, ArrowRightOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import newApiService from '../utils/newApiService';
import '../App.css';

const { Text, Title } = Typography;

/**
 * 欢迎页面 - 全新生物科技主题设计
 */
const WelcomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [diseaseCount] = useState(30170);
  const [geneCount] = useState(17247);
  const [miRNACount] = useState(4797);
  const [apiStatus, setApiStatus] = useState({
    type: 'loading',
    status: t('loading'),
    lastChecked: '-',
    responseTime: null,
    details: null
  });

  useEffect(() => { fetchData(); }, []);

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
      } else {
        setApiStatus({
          type: 'warning',
          status: t('apiMockData'),
          lastChecked: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          responseTime: endTime - startTime,
          details: response
        });
        notification.warning({ message: t('connectionError'), description: t('loadingError'), duration: 5 });
      }
    } catch (error) {
      setApiStatus({
        type: 'error',
        status: t('apiDisconnected'),
        lastChecked: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        error: error.message
      });
    }
  };

  const handleStartExplore = () => {
    // 导航到登录页
    navigate('/login');
  };

  // 统计数据
  const stats = [
    {
      label: 'API 状态',
      value: apiStatus.status,
      icon: <ExperimentOutlined />,
      color: apiStatus.type === 'success' ? '#2563EB' : apiStatus.type === 'warning' ? '#F59E0B' : '#EF4444',
      tooltip: (
        <div style={{ minWidth: 200 }}>
          <div><ClockCircleOutlined /> 响应: {apiStatus.responseTime ? `${apiStatus.responseTime}ms` : '--'}</div>
          <div><InfoCircleOutlined /> 状态: {apiStatus.details?.status || '未知'}</div>
          {apiStatus.details?.model_available !== undefined && (
            <div>模型: <Badge status={apiStatus.details.model_available ? 'success' : 'warning'} text={apiStatus.details.model_available ? '可用' : '不可用'} /></div>
          )}
          <div style={{ marginTop: 4, opacity: 0.7, fontSize: 11 }}>更新: {apiStatus.lastChecked}</div>
        </div>
      )
    },
    { label: '疾病数据', value: diseaseCount.toLocaleString(), icon: <DatabaseOutlined />, color: '#2563EB', tooltip: t('diseasesAvailable') },
    { label: '基因数量', value: geneCount.toLocaleString(), icon: <NodeIndexOutlined />, color: '#D4AF37', tooltip: t('genesAvailable') },
    { label: 'miRNA 数量', value: miRNACount.toLocaleString(), icon: <PartitionOutlined />, color: '#60A5FA', tooltip: t('miRNAsAvailable') },
  ];

  // 功能特性
  const features = [
    {
      icon: <NodeIndexOutlined />,
      title: t('welcome.feature1Title'),
      desc: t('welcome.feature1Desc'),
      color: '#2563EB',
      bg: 'rgba(37,99,235,0.1)',
    },
    {
      icon: <InteractionOutlined />,
      title: t('welcome.feature2Title'),
      desc: t('welcome.feature2Desc'),
      color: '#D4AF37',
      bg: 'rgba(212,175,55,0.1)',
    },
    {
      icon: <BranchesOutlined />,
      title: t('welcome.feature3Title'),
      desc: t('welcome.feature3Desc'),
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      icon: <SlidersOutlined />,
      title: t('welcome.feature4Title'),
      desc: t('welcome.feature4Desc'),
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.1)',
    },
  ];

  // 快速入门
  const steps = [
    { step: '01', icon: <SearchOutlined />, title: t('welcome.step1Title'), desc: t('welcome.step1Desc') },
    { step: '02', icon: <DatabaseOutlined />, title: t('welcome.step2Title'), desc: t('welcome.step2Desc') },
    { step: '03', icon: <PartitionOutlined />, title: t('welcome.step3Title'), desc: t('welcome.step3Desc') },
  ];

  return (
    <div className="welcome-container">
      {/* ===== Hero 区域 ===== */}
      <div className="welcome-theme" style={{ minHeight: '100vh' }}>
        {/* 左上角语言切换 */}
        <div style={{ position: 'absolute', top: 24, right: 28, zIndex: 20 }}>
          <div className="language-switch-container">
            <ApiOutlined style={{ color: 'rgba(191,219,254,0.6)', marginRight: 6 }} />
            <span style={{ color: 'rgba(191,219,254,0.7)', fontSize: 12, marginRight: 8 }}>
              {apiStatus.type === 'loading' ? '检查中...' :
               apiStatus.type === 'success' ? 'API 在线' :
               apiStatus.type === 'warning' ? 'API 警告' : 'API 离线'}
            </span>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: apiStatus.type === 'success' ? '#3B82F6' :
                          apiStatus.type === 'warning' ? '#F59E0B' : '#EF4444',
              boxShadow: `0 0 8px ${apiStatus.type === 'success' ? '#3B82F6' :
                           apiStatus.type === 'warning' ? '#F59E0B' : '#EF4444'}`,
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>

        {/* 主 Hero 内容 */}
        <div className="welcome-content">
          {/* 品牌 Logo 图标 */}
          <div className="animate-title" style={{ marginBottom: 32 }}>
            <div style={{
              width: 90, height: 90, margin: '0 auto 28px',
              background: 'rgba(59,130,246,0.1)',
              border: '2px solid rgba(59,130,246,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(59,130,246,0.2)',
              position: 'relative',
            }}>
              {/* DNA 图标 SVG */}
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6" opacity="0.9"/>
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {/* 外环 */}
              <div style={{
                position: 'absolute', inset: -4,
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '50%',
                animation: 'pulse 3s infinite'
              }} />
            </div>

            <h1 className="welcome-title">
              疾视
              <sup className="beta-tag">BETA</sup>
            </h1>
            <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
          </div>

          {/* CTA 按钮 */}
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

          {/* 统计指标 */}
          <div className="welcome-stats fade-in">
            {stats.map((stat, i) => (
              <Tooltip key={i} title={stat.tooltip}>
                <div className="welcome-stat-card">
                  <div style={{ fontSize: 22, color: stat.color, marginBottom: 6 }}>
                    {stat.icon}
                  </div>
                  <h3>{stat.label}</h3>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#EFF6FF', letterSpacing: 0.5 }}>
                    {stat.value}
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 底部滚动提示 */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 10, animation: 'pulse 2s infinite', cursor: 'pointer'
        }} onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <span style={{ color: 'rgba(191,219,254,0.5)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            了解更多
          </span>
          <div style={{
            width: 24, height: 36, border: '2px solid rgba(59,130,246,0.4)',
            borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6
          }}>
            <div style={{
              width: 4, height: 8, background: 'rgba(59,130,246,0.6)',
              borderRadius: 2, animation: 'shimmerLine 1.5s ease-in-out infinite'
            }} />
          </div>
        </div>
      </div>

      {/* ===== 功能特性区域 ===== */}
      <div id="features-section" style={{
        background: 'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)',
        padding: '80px 32px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 20, padding: '6px 16px', marginBottom: 16,
            }}>
              <BulbOutlined style={{ color: '#2563EB' }} />
              <span style={{ color: '#1E40AF', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                核心功能
              </span>
            </div>
            <h2 style={{
              fontSize: '2rem', fontWeight: 900, color: '#1E3A8A',
              margin: '0 0 12px', letterSpacing: 1
            }}>
              {t('welcome.features')}
            </h2>
            <p style={{ color: '#475569', maxWidth: 480, margin: '0 auto', fontSize: 15 }}>
              集成多维度疾病数据分析，助力基因-miRNA-疾病关联研究
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {features.map((f, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <div style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: '28px 24px',
                  height: '100%',
                  border: '1px solid rgba(59,130,246,0.2)',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.08)',
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(59,130,246,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
                  }}
                >
                  {/* 右上角装饰 */}
                  <div style={{
                    position: 'absolute', top: -20, right: -20,
                    width: 80, height: 80, borderRadius: '50%',
                    background: f.bg, opacity: 0.6,
                  }} />

                  {/* 图标 */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: f.bg, border: `1px solid ${f.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: f.color, marginBottom: 18,
                  }}>
                    {f.icon}
                  </div>

                  <div style={{
                    width: 28, height: 3, background: f.color,
                    borderRadius: 2, marginBottom: 14, opacity: 0.7
                  }} />

                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 10, lineHeight: 1.4 }}>
                    {f.title}
                  </h3>
                  <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* ===== 快速入门区域 ===== */}
      <div style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
        padding: '80px 32px',
        borderTop: '1px solid rgba(59,130,246,0.15)',
        borderBottom: '1px solid rgba(59,130,246,0.15)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 20, padding: '6px 16px', marginBottom: 16,
            }}>
              <CheckCircleOutlined style={{ color: '#F59E0B' }} />
              <span style={{ color: '#B45309', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                快速开始
              </span>
            </div>
            <h2 style={{
              fontSize: '2rem', fontWeight: 900, color: '#1E3A8A',
              margin: '0 0 12px'
            }}>
              {t('welcome.quickStart')}
            </h2>
            <p style={{ color: '#475569', fontSize: 15 }}>
              三步即可开始您的疾病关联分析之旅
            </p>
          </div>

          {/* 步骤卡片 */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                flex: '1 1 240px', maxWidth: 280,
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                borderRadius: 20,
                padding: '32px 24px',
                border: '1px solid rgba(59,130,246,0.25)',
                boxShadow: '0 2px 12px rgba(59,130,246,0.1)',
                position: 'relative',
                transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
                }}
              >
                {/* 步骤编号 */}
                <div style={{
                  fontSize: 48, fontWeight: 900,
                  color: 'rgba(59,130,246,0.15)',
                  position: 'absolute', top: 12, right: 20,
                  lineHeight: 1, fontFamily: 'monospace',
                }}>
                  {step.step}
                </div>

                {/* 图标 */}
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'white', marginBottom: 20,
                  boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
                }}>
                  {step.icon}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E40AF', marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>

                {/* 连接箭头 */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute', right: -20, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(59,130,246,0.4)', fontSize: 20, zIndex: 1,
                  }}>
                    <ArrowRightOutlined />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 底部行动按钮 */}
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleStartExplore}
              icon={<PlayCircleOutlined />}
              style={{
                height: 52, padding: '0 40px', fontSize: 16, fontWeight: 700,
                borderRadius: 26,
                background: 'linear-gradient(135deg, #0D5E3F, #2563EB)',
                border: 'none',
                boxShadow: '0 6px 24px rgba(13,94,63,0.35)',
              }}
            >
              立即开始探索
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 数据亮点 ===== */}
      <div style={{
        background: 'linear-gradient(160deg, #1E3A8A 0%, #1E40AF 40%, #2563EB 100%)',
        padding: '60px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景网格 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#EFF6FF', margin: '0 0 8px' }}>
              数据规模
            </h2>
            <p style={{ color: 'rgba(191,219,254,0.6)', fontSize: 14 }}>
              覆盖全面的疾病-基因-miRNA 知识图谱
            </p>
          </div>

          <Row gutter={[32, 32]} justify="center">
            {[
              { num: '30,170', label: '疾病表型', icon: <DatabaseOutlined />, color: '#3B82F6' },
              { num: '17,247', label: '基因实体', icon: <NodeIndexOutlined />, color: '#D4AF37' },
              { num: '4,797', label: 'miRNA 分子', icon: <PartitionOutlined />, color: '#60A5FA' },
            ].map((item, i) => (
              <Col xs={24} sm={8} key={i}>
                <div style={{
                  textAlign: 'center',
                  padding: '32px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: 20,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 28, color: item.color, marginBottom: 12 }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#EFF6FF', lineHeight: 1, marginBottom: 8 }}>
                    {item.num}
                  </div>
                  <div style={{ color: 'rgba(191,219,254,0.6)', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* ===== 页脚 ===== */}
      <footer className="welcome-footer">
        <div className="welcome-footer-content">
          <div className="footer-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6" opacity="0.9"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="footer-logo-text">
              疾视<sup className="beta-tag" style={{ fontSize: '8px', top: '-5px', padding: '1px 3px' }}>BETA</sup>
              &nbsp;· Disease Relationship Visualization
            </span>
          </div>
          <span className="welcome-footer-text">
            © 2025 疾视 可视化平台 · 基于 RGMI 模型构建
          </span>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
