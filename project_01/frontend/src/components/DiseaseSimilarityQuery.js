import React, { useState, useEffect, useRef } from 'react';
import {
  Select, Space, Spin, Alert, Typography, Tag, Divider, Row, Col, Statistic,
  Form, Input, message, Empty, Tooltip, Progress, Button, Dropdown, Menu
} from 'antd';
import {
  RadarChartOutlined, SwapOutlined, InfoCircleOutlined, ExperimentOutlined,
  SearchOutlined, ArrowRightOutlined, CheckCircleOutlined, DownloadOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import newApiService from '../utils/newApiService';
import { exportSimilarityAnalysis } from '../utils/exportService';
import DiseaseRadarComparison from './DiseaseRadarComparison';
import './DiseaseSimilarityQuery.css';

const { Title, Text, Paragraph } = Typography;

/**
 * 疾病相似度查询组件
 * 功能：输入两个疾病，查询相似度并展示三维对比图
 */
const DiseaseSimilarityQuery = ({ diseaseData = [] }) => {
  // 状态管理
  const [disease1, setDisease1] = useState(null);
  const [disease2, setDisease2] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [options1, setOptions1] = useState([]);
  const [options2, setOptions2] = useState([]);
  const [searching1, setSearching1] = useState(false);
  const [searching2, setSearching2] = useState(false);
  const searchTimer1 = useRef(null);
  const searchTimer2 = useRef(null);

  // 处理疾病选择
  const handleDisease1Change = (value, option) => {
    const name = option?.name || option?.label || value;
    const selected = { disease_id: value, name };
    setDisease1(selected);
    if (disease2 && selected.disease_id === disease2.disease_id) {
      setDisease2(null);
    }
  };

  const handleDisease2Change = (value, option) => {
    const name = option?.name || option?.label || value;
    const selected = { disease_id: value, name };
    setDisease2(selected);
    if (disease1 && selected.disease_id === disease1.disease_id) {
      setDisease1(null);
    }
  };

  // 交换两个疾病
  const handleSwapDiseases = () => {
    const temp = disease1;
    setDisease1(disease2);
    setDisease2(temp);
    setComparisonData(null);
  };

  // 查询相似度
  const handleQuerySimilarity = async () => {
    if (!disease1 || !disease2) {
      message.warning('请选择两个疾病进行对比');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await newApiService.compareDiseases(
        disease1.disease_id,
        disease2.disease_id
      );

      console.log('[DiseaseSimilarityQuery] 收到对比数据:', data);
      setComparisonData(data);
      message.success('相似度查询成功');
    } catch (err) {
      console.error('查询相似度失败:', err);
      setError('无法加载对比数据，请稍后重试');
      message.error('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取相似度值
  const getSimilarityScore = () => {
    if (!comparisonData) return null;

    if (typeof comparisonData.similarity === 'number') {
      return (comparisonData.similarity * 100).toFixed(1);
    }

    if (Array.isArray(comparisonData.similarity_data)) {
      const avg = comparisonData.similarity_data.reduce((a, b) => a + b, 0) / comparisonData.similarity_data.length;
      return (avg * 100).toFixed(1);
    }

    return null;
  };

  // 获取相似度等级
  const getSimilarityLevel = () => {
    const score = parseFloat(getSimilarityScore());
    if (score >= 80) return { level: '极高', color: '#f5222d' };
    if (score >= 60) return { level: '高', color: '#fa8c16' };
    if (score >= 40) return { level: '中', color: '#faad14' };
    if (score >= 20) return { level: '低', color: '#1890ff' };
    return { level: '极低', color: '#8c8c8c' };
  };

  // 导出为CSV
  const handleExportCSV = async () => {
    if (!disease1 || !disease2 || !comparisonData) {
      message.warning('请先完成查询');
      return;
    }

    try {
      await exportSimilarityAnalysis(disease1.disease_id, disease2.disease_id, 'csv');
      message.success('导出成功');
    } catch (err) {
      console.error('导出CSV失败:', err);
      message.error('导出失败，请稍后重试');
    }
  };

  // 导出为JSON
  const handleExportJSON = async () => {
    if (!disease1 || !disease2 || !comparisonData) {
      message.warning('请先完成查询');
      return;
    }

    try {
      await exportSimilarityAnalysis(disease1.disease_id, disease2.disease_id, 'json');
      message.success('导出成功');
    } catch (err) {
      console.error('导出JSON失败:', err);
      message.error('导出失败，请稍后重试');
    }
  };

  const similarityScore = getSimilarityScore();
  const similarityLevel = getSimilarityLevel();

  const buildSelectOptions = (items, disabledId) => {
    return (items || []).map(it => {
      const diseaseId = it.disease_id || it.id;
      const diseaseName = it.name || diseaseId;
      return {
        value: diseaseId,
        label: `${diseaseName} (${diseaseId})`,
        name: diseaseName,
        disabled: disabledId ? diseaseId === disabledId : false
      };
    });
  };

  const fetchSearchOptions = async (query, setOptions, setSearching) => {
    setSearching(true);
    const list = await newApiService.searchDiseases(query, 20);
    setOptions(list || []);
    setSearching(false);
  };

  const onSearchDisease1 = (value) => {
    if (searchTimer1.current) {
      clearTimeout(searchTimer1.current);
    }
    searchTimer1.current = setTimeout(() => {
      fetchSearchOptions(value, setOptions1, setSearching1);
    }, 250);
  };

  const onSearchDisease2 = (value) => {
    if (searchTimer2.current) {
      clearTimeout(searchTimer2.current);
    }
    searchTimer2.current = setTimeout(() => {
      fetchSearchOptions(value, setOptions2, setSearching2);
    }, 250);
  };

  const onOpenDisease1 = async (open) => {
    if (!open) return;
    if ((options1 || []).length > 0) return;
    await fetchSearchOptions('', setOptions1, setSearching1);
  };

  const onOpenDisease2 = async (open) => {
    if (!open) return;
    if ((options2 || []).length > 0) return;
    await fetchSearchOptions('', setOptions2, setSearching2);
  };

  return (
    <div className="disease-similarity-query-page">
      {/* 搜索区域 */}
      <div className="similarity-search-section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 className="module-title" style={{ display: 'inline-block' }}>疾病相似度查询</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: -8 }}>选择两个疾病进行相似度对比分析</p>
        </div>

        {/* 疾病选择区域 */}
        <div className="disease-selection-area">
          <Row gutter={[24, 24]} align="middle" justify="center">
            {/* 疾病1选择 */}
            <Col xs={24} sm={10}>
              <div className="disease-select-wrapper">
                <label className="select-label">疾病1</label>
                <Select
                  placeholder="输入疾病名称或ID"
                  value={disease1?.disease_id}
                  onChange={handleDisease1Change}
                  showSearch
                  filterOption={false}
                  onSearch={onSearchDisease1}
                  onDropdownVisibleChange={onOpenDisease1}
                  style={{ width: '100%' }}
                  size="large"
                  options={buildSelectOptions(options1, disease2?.disease_id)}
                  notFoundContent={searching1 ? <Spin size="small" /> : null}
                />
                {disease1 && (
                  <div className="selected-disease-info">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <span>{disease1.name}</span>
                  </div>
                )}
              </div>
            </Col>

            {/* 交换按钮 */}
            <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
              <Tooltip title="交换两个疾病">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SwapOutlined />}
                  size="large"
                  onClick={handleSwapDiseases}
                  disabled={!disease1 || !disease2}
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                    border: 'none'
                  }}
                />
              </Tooltip>
            </Col>

            {/* 疾病2选择 */}
            <Col xs={24} sm={10}>
              <div className="disease-select-wrapper">
                <label className="select-label">疾病2</label>
                <Select
                  placeholder="输入疾病名称或ID"
                  value={disease2?.disease_id}
                  onChange={handleDisease2Change}
                  showSearch
                  filterOption={false}
                  onSearch={onSearchDisease2}
                  onDropdownVisibleChange={onOpenDisease2}
                  style={{ width: '100%' }}
                  size="large"
                  options={buildSelectOptions(options2, disease1?.disease_id)}
                  notFoundContent={searching2 ? <Spin size="small" /> : null}
                />
                {disease2 && (
                  <div className="selected-disease-info">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <span>{disease2.name}</span>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* 查询按钮 */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleQuerySimilarity}
              loading={loading}
              disabled={!disease1 || !disease2}
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                border: 'none',
                minWidth: 200
              }}
            >
              {loading ? '查询中...' : '查询相似度'}
            </Button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="查询失败"
          description={error}
          type="error"
          closable
          style={{ marginBottom: 24, marginTop: 24, maxWidth: 1200, margin: '24px auto' }}
          onClose={() => setError(null)}
        />
      )}

      {/* 相似度概览 */}
      {comparisonData && disease1 && disease2 && (
        <div style={{ maxWidth: 1200, margin: '0 auto 40px', padding: '0 20px' }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 40,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <Row gutter={[32, 32]} align="middle">
              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>疾病1</Text>
                </div>
                <div style={{
                  padding: 16,
                  background: '#f0f7ff',
                  borderRadius: 8,
                  border: '2px solid #d4e6f7'
                }}>
                  <Title level={4} style={{ margin: 0, color: '#1e40af' }}>
                    {disease1.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {disease1.disease_id}
                  </Text>
                </div>
              </Col>

              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>相似度</Text>
                </div>
                <div style={{
                  padding: 24,
                  background: `linear-gradient(135deg, ${similarityLevel.color}15 0%, ${similarityLevel.color}05 100%)`,
                  borderRadius: 8,
                  border: `2px solid ${similarityLevel.color}40`
                }}>
                  <Title level={2} style={{ margin: '0 0 8px 0', color: similarityLevel.color }}>
                    {similarityScore}%
                  </Title>
                  <Tag color={similarityLevel.color} style={{ fontSize: 12 }}>
                    {similarityLevel.level}
                  </Tag>
                </div>
              </Col>

              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>疾病2</Text>
                </div>
                <div style={{
                  padding: 16,
                  background: '#f0f7ff',
                  borderRadius: 8,
                  border: '2px solid #d4e6f7'
                }}>
                  <Title level={4} style={{ margin: 0, color: '#1e40af' }}>
                    {disease2.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {disease2.disease_id}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* 导出按钮 */}
            <Row justify="center" style={{ marginTop: 32 }}>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="csv" onClick={handleExportCSV}>
                      导出为 CSV
                    </Menu.Item>
                    <Menu.Item key="json" onClick={handleExportJSON}>
                      导出为 JSON
                    </Menu.Item>
                  </Menu>
                }
                placement="bottomCenter"
              >
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  style={{
                    borderColor: '#8B5CF6',
                    color: '#8B5CF6'
                  }}
                >
                  导出结果
                </Button>
              </Dropdown>
            </Row>
          </div>
        </div>
      )}

      {/* 详细对比分析 - 直接显示 */}
      {comparisonData && disease1 && disease2 && (
        <div className="detailed-analysis-area">
          <DiseaseRadarComparison
            disease1={disease1}
            disease2={disease2}
          />
        </div>
      )}

      {/* 空状态提示 */}
      {!comparisonData && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', marginTop: 40, maxWidth: 1200, margin: '40px auto' }}>
          <Empty
            description="选择两个疾病并点击查询按钮开始对比"
            style={{ marginBottom: 24 }}
          />
          <Text type="secondary">
            系统将为您计算两个疾病的相似度，并通过多维度图表展示对比结果
          </Text>
        </div>
      )}
    </div>
  );
};

export default DiseaseSimilarityQuery;
