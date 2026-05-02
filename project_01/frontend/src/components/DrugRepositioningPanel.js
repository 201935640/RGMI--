import React, { useState, useEffect } from 'react';
import { Card, List, Spin, Alert, Empty, Progress, Tag, Space, Typography, Button, Tooltip, Divider, Row, Col, Statistic, Dropdown, Menu, message } from 'antd';
import { MedicineBoxOutlined, ExperimentOutlined, InfoCircleOutlined, LinkOutlined, ThunderboltOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import newApiService from '../utils/newApiService';
import { exportDrugRepositioning } from '../utils/exportService';
import './DrugRepositioningPanel.css';

const { Title, Text, Paragraph } = Typography;

/**
 * 智能药物重定位面板组件
 * Drug Repositioning Panel Component - AI-powered drug recommendation
 */
const DrugRepositioningPanel = ({ diseaseId, language = 'zh' }) => {
  // 状态管理
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 获取药物重定位数据
  useEffect(() => {
    if (diseaseId) {
      fetchDrugRepositioning();
    }
  }, [diseaseId]);

  /**
   * 获取药物重定位推荐
   */
  const fetchDrugRepositioning = async () => {
    if (!diseaseId) return;

    console.log('[DrugRepositioningPanel] 开始获取药物推荐，diseaseId:', diseaseId);
    setLoading(true);
    setError(null);

    try {
      const data = await newApiService.getDrugRepositioning(diseaseId);
      console.log('[DrugRepositioningPanel] 收到数据:', data);

      // 后端返回的是 recommendations 而不是 drugs
      if (data && data.recommendations) {
        console.log('[DrugRepositioningPanel] 药物数量:', data.recommendations.length);
        setDrugs(data.recommendations);

        // 计算统计信息
        const stats = {
          total: data.recommendations.length,
          highConfidence: data.recommendations.filter(d => d.confidence >= 0.8).length,
          mediumConfidence: data.recommendations.filter(d => d.confidence >= 0.5 && d.confidence < 0.8).length,
          avgConfidence: data.recommendations.reduce((sum, d) => sum + d.confidence, 0) / data.recommendations.length
        };
        setStatistics(stats);
      } else {
        console.log('[DrugRepositioningPanel] 没有推荐数据');
        setDrugs([]);
      }
    } catch (err) {
      console.error('[DrugRepositioningPanel] 获取药物重定位数据失败:', err);
      setError(t(
        '无法加载药物推荐数据，请稍后重试',
        'Failed to load drug recommendations, please try again later'
      ));
    } finally {
      console.log('[DrugRepositioningPanel] 加载完成');
      setLoading(false);
    }
  };

  /**
   * 获取置信度等级
   */
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) {
      return {
        text: t('高', 'High'),
        color: '#52c41a',
        icon: <CheckCircleOutlined />
      };
    } else if (confidence >= 0.5) {
      return {
        text: t('中', 'Medium'),
        color: '#1890ff',
        icon: <InfoCircleOutlined />
      };
    } else {
      return {
        text: t('低', 'Low'),
        color: '#faad14',
        icon: <InfoCircleOutlined />
      };
    }
  };

  /**
   * 获取DrugBank链接
   */
  const getDrugBankLink = (drugId) => {
    if (drugId && drugId.startsWith('DB')) {
      return `https://go.drugbank.com/drugs/${drugId}`;
    }
    return null;
  };

  /**
   * 导出推荐药物
   */
  const handleExportDrugs = async (format) => {
    if (!diseaseId) {
      message.warning('请先选择疾病');
      return;
    }

    try {
      await exportDrugRepositioning(diseaseId, format);
      message.success('导出成功');
    } catch (err) {
      console.error('导出失败:', err);
      message.error('导出失败，请稍后重试');
    }
  };

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 20 }}>
            {t('正在分析药物重定位推荐...', 'Analyzing drug repositioning recommendations...')}
          </Paragraph>
        </div>
      </Card>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('加载失败', 'Loading Failed')}
        description={error}
        action={
          <Button size="small" onClick={fetchDrugRepositioning}>
            {t('重试', 'Retry')}
          </Button>
        }
      />
    );
  }

  /**
   * 渲染空状态
   */
  if (!drugs || drugs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('暂无药物推荐数据', 'No drug recommendations available')}
      >
        <Button type="primary" onClick={fetchDrugRepositioning}>
          {t('重新加载', 'Reload')}
        </Button>
      </Empty>
    );
  }

  return (
    <div className="drug-repositioning-panel">
      {/* 头部信息 */}
      <Card className="info-card" bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="panel-header">
            <Space>
              <ExperimentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                {t('AI智能药物重定位推荐', 'AI-Powered Drug Repositioning Recommendations')}
              </Title>
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              {t(
                '基于疾病相似性和AI模型推理，为您推荐可能有效的治疗药物',
                'Recommend potentially effective drugs based on disease similarity and AI model inference'
              )}
            </Paragraph>
          </div>

          {/* 统计信息 */}
          {statistics && (
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={t('推荐药物总数', 'Total Drugs')}
                  value={statistics.total}
                  prefix={<MedicineBoxOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('高置信度', 'High Confidence')}
                  value={statistics.highConfidence}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('中置信度', 'Medium Confidence')}
                  value={statistics.mediumConfidence}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('平均置信度', 'Avg Confidence')}
                  value={(statistics.avgConfidence * 100).toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          )}
        </Space>
      </Card>

      <Divider />

      {/* 药物列表 */}
      <List
        className="drug-list"
        dataSource={drugs}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => t(`共 ${total} 个推荐药物`, `Total ${total} drugs`)
        }}
        renderItem={(drug, index) => {
          const confidenceLevel = getConfidenceLevel(drug.confidence);
          const drugBankLink = getDrugBankLink(drug.drug_id);

          return (
            <List.Item className="drug-item">
              <Card
                hoverable
                className="drug-card"
                style={{ width: '100%' }}
              >
                <div className="drug-header">
                  <Space>
                    <div className="drug-rank">#{index + 1}</div>
                    <div className="drug-info">
                      <Title level={5} style={{ margin: 0 }}>
                        {drug.drug_name}
                      </Title>
                    </div>
                  </Space>

                  <Space>
                    <Tag color={confidenceLevel.color} icon={confidenceLevel.icon}>
                      {confidenceLevel.text}
                    </Tag>
                  </Space>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div className="drug-details">
                  <div className="confidence-section">
                    <Text strong>{t('置信度分数', 'Confidence Score')}:</Text>
                    <Progress
                      percent={(drug.confidence * 100).toFixed(1)}
                      strokeColor={{
                        '0%': confidenceLevel.color,
                        '100%': confidenceLevel.color
                      }}
                      style={{ marginTop: 8 }}
                    />
                  </div>

                  {drug.evidence && (
                    <div className="reasoning-section" style={{ marginTop: 12 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>
                          <InfoCircleOutlined /> {t('推荐依据', 'Recommendation Basis')}:
                        </Text>
                        <Paragraph
                          className="reasoning-text"
                          style={{
                            background: '#f0f5ff',
                            padding: '12px',
                            borderRadius: '4px',
                            marginBottom: 0
                          }}
                        >
                          {drug.evidence}
                        </Paragraph>
                      </Space>
                    </div>
                  )}
                </div>
              </Card>
            </List.Item>
          );
        }}
      />

      {/* 免责声明 */}
      <Alert
        type="warning"
        showIcon
        message={t('重要提示', 'Important Notice')}
        description={t(
          '本推荐系统基于AI模型和疾病相似性分析，仅供科研参考。任何治疗决策应咨询专业医生。',
          'This recommendation system is based on AI models and disease similarity analysis, for research purposes only. Consult professional doctors for any treatment decisions.'
        )}
        style={{ marginTop: 24 }}
      />
    </div>
  );
};

export default DrugRepositioningPanel;
