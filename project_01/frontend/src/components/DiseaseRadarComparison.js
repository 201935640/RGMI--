import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Space, Spin, Alert, Typography, Tag, Divider, Row, Col, Statistic } from 'antd';
import { RadarChartOutlined, SwapOutlined, InfoCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import newApiService from '../utils/newApiService';
import './DiseaseRadarComparison.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 疾病雷达图对比组件 - 3D多维度科学对比
 * Disease Radar Comparison Component - 3D Multi-dimensional Scientific Comparison
 */
const DiseaseRadarComparison = ({
  disease1,
  disease2,
  language = 'zh',
  onClose
}) => {
  // 状态管理
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 当疾病改变时，获取对比数据
  useEffect(() => {
    if (disease1 && disease2) {
      fetchComparisonData();
    }
  }, [disease1, disease2]);

  /**
   * 获取疾病对比数据
   */
  const fetchComparisonData = async () => {
    if (!disease1 || !disease2) return;

    setLoading(true);
    setError(null);

    try {
      const data = await newApiService.compareDiseases(
        disease1.disease_id,
        disease2.disease_id
      );

      console.log('[DiseaseRadarComparison] 收到对比数据:', data);
      console.log('[DiseaseRadarComparison] similarity_data:', data.similarity_data);
      console.log('[DiseaseRadarComparison] similarity_data类型:', typeof data.similarity_data, Array.isArray(data.similarity_data));
      if (data.similarity_data) {
        console.log('[DiseaseRadarComparison] 各维度值:', {
          index0: data.similarity_data[0],
          index1: data.similarity_data[1],
          index2: data.similarity_data[2]
        });
      }

      setComparisonData(data);
    } catch (err) {
      console.error('获取疾病对比数据失败:', err);
      setError(t(
        '无法加载对比数据，请稍后重试',
        'Failed to load comparison data, please try again later'
      ));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 从后端数据中提取三个维度的相似度值
   */
  const getSimilarityValues = () => {
    if (!comparisonData || !comparisonData.similarity_data) {
      return { hpo_similarity: 0, mirna_similarity: 0, gene_overlap: 0 };
    }
    const similarityValues = comparisonData.similarity_data;
    return {
      hpo_similarity: similarityValues[0] || 0,
      mirna_similarity: similarityValues[1] || 0,
      gene_overlap: similarityValues[2] || 0
    };
  };

  /**
   * 获取雷达图配置
   */
  const getRadarOption = () => {
    if (!comparisonData) return {};

    // 后端返回的是 similarity_data 数组，包含三个维度的相似度
    const { hpo_similarity, mirna_similarity, gene_overlap } = getSimilarityValues();

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (!params.value || !Array.isArray(params.value)) {
            return '';
          }

          const dimensionNames = [
            t('表型相似度 (HPO)', 'Phenotype Similarity (HPO)'),
            t('miRNA 相似度', 'miRNA Similarity'),
            t('基因交互重合度', 'Gene Interaction Overlap')
          ];

          // 构建所有维度的显示
          let result = '<div style="padding: 5px;">';
          params.value.forEach((value, index) => {
            const percentage = (value * 100).toFixed(1);
            result += `${dimensionNames[index]}: <strong>${percentage}%</strong><br/>`;
          });
          result += '</div>';

          return result;
        }
      },
      legend: {
        data: [t('相似度指标', 'Similarity Metrics')],
        bottom: 20,
        textStyle: {
          fontSize: 14
        }
      },
      radar: {
        indicator: [
          {
            name: t('表型相似度\n(HPO)', 'Phenotype\nSimilarity'),
            max: 1,
            axisLabel: {
              show: true,
              formatter: (value) => (value * 100).toFixed(0) + '%'
            }
          },
          {
            name: t('miRNA\n相似度', 'miRNA\nSimilarity'),
            max: 1,
            axisLabel: {
              show: true,
              formatter: (value) => (value * 100).toFixed(0) + '%'
            }
          },
          {
            name: t('基因交互\n重合度', 'Gene\nOverlap'),
            max: 1,
            axisLabel: {
              show: true,
              formatter: (value) => (value * 100).toFixed(0) + '%'
            }
          }
        ],
        shape: 'polygon',
        splitNumber: 5,
        name: {
          textStyle: {
            color: '#333',
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        splitLine: {
          lineStyle: {
            color: ['#e0e0e0', '#e8e8e8', '#f0f0f0', '#f5f5f5', '#fafafa']
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(26, 41, 128, 0.05)', 'rgba(26, 41, 128, 0.1)',
                    'rgba(26, 41, 128, 0.15)', 'rgba(26, 41, 128, 0.2)',
                    'rgba(26, 41, 128, 0.25)']
          }
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        }
      },
      series: [{
        name: t('相似度指标', 'Similarity Metrics'),
        type: 'radar',
        data: [
          {
            value: [hpo_similarity, mirna_similarity, gene_overlap],
            name: t('相似度', 'Similarity'),
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              width: 3,
              color: '#1a2980'
            },
            areaStyle: {
              color: 'rgba(26, 41, 128, 0.3)'
            },
            itemStyle: {
              color: '#1a2980',
              borderWidth: 2,
              borderColor: '#fff'
            }
          }
        ]
      }]
    };
  };

  /**
   * 获取相似度等级
   */
  const getSimilarityLevel = (value) => {
    if (value >= 0.8) return { text: t('极高', 'Very High'), color: '#52c41a' };
    if (value >= 0.6) return { text: t('高', 'High'), color: '#1890ff' };
    if (value >= 0.4) return { text: t('中等', 'Medium'), color: '#faad14' };
    if (value >= 0.2) return { text: t('低', 'Low'), color: '#ff7a45' };
    return { text: t('极低', 'Very Low'), color: '#f5222d' };
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
            {t('正在分析疾病相似度...', 'Analyzing disease similarity...')}
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
      <Card>
        <Alert
          message={t('加载失败', 'Loading Failed')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchComparisonData}>
              {t('重试', 'Retry')}
            </Button>
          }
        />
      </Card>
    );
  }

  /**
   * 渲染主界面
   */
  return (
    <div className="disease-radar-comparison">
      <Card
        title={
          <Space>
            <RadarChartOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>{t('3D 多维度疾病对比分析', '3D Multi-dimensional Disease Comparison')}</span>
            <Tag color="blue">{t('AI 驱动', 'AI-Powered')}</Tag>
          </Space>
        }
        extra={
          onClose && (
            <Button onClick={onClose}>
              {t('关闭', 'Close')}
            </Button>
          )
        }
      >
        {/* 疾病选择器 */}
        <div className="disease-selector" style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Card size="small" className="disease-card primary">
                <Space direction="vertical" size={0}>
                  <Text type="secondary">{t('主疾病', 'Primary Disease')}</Text>
                  <Title level={5} style={{ margin: 0 }}>
                    {disease1?.name || disease1?.disease_id}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ID: {disease1?.disease_id}
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col span={4} style={{ textAlign: 'center' }}>
              <SwapOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            </Col>

            <Col span={10}>
              <Card size="small" className="disease-card comparison">
                <Space direction="vertical" size={0}>
                  <Text type="secondary">{t('对比疾病', 'Comparison Disease')}</Text>
                  <Title level={5} style={{ margin: 0 }}>
                    {disease2?.name || disease2?.disease_id}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ID: {disease2?.disease_id}
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* 雷达图 */}
        {comparisonData && (
          <>
            <div className="radar-chart-container">
              <ReactECharts
                option={getRadarOption()}
                style={{ height: '450px', width: '100%' }}
                notMerge={true}
              />
            </div>

            <Divider />

            {/* 疾病多维相似度分析标题 */}
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              {t('疾病多维相似度分析', 'Multi-dimensional Disease Similarity Analysis')}
            </Title>

            {/* 详细指标 */}
            <div className="metrics-detail">
              <Title level={5}>
                <ExperimentOutlined /> {t('详细分析指标', 'Detailed Analysis Metrics')}
              </Title>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Card className="metric-card">
                    <Statistic
                      title={
                        <Space>
                          <span>{t('表型相似度 (HPO)', 'Phenotype Similarity')}</span>
                          <Tag color={getSimilarityLevel(getSimilarityValues().hpo_similarity).color}>
                            {getSimilarityLevel(getSimilarityValues().hpo_similarity).text}
                          </Tag>
                        </Space>
                      }
                      value={(getSimilarityValues().hpo_similarity * 100).toFixed(1)}
                      suffix="%"
                      valueStyle={{ color: getSimilarityLevel(getSimilarityValues().hpo_similarity).color }}
                    />
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      {t(
                        '基于 HPO 本体论的语义相似度计算',
                        'Based on HPO ontology semantic similarity'
                      )}
                    </Paragraph>
                  </Card>
                </Col>

                <Col span={8}>
                  <Card className="metric-card">
                    <Statistic
                      title={
                        <Space>
                          <span>{t('miRNA 相似度', 'miRNA Similarity')}</span>
                          <Tag color={getSimilarityLevel(getSimilarityValues().mirna_similarity).color}>
                            {getSimilarityLevel(getSimilarityValues().mirna_similarity).text}
                          </Tag>
                        </Space>
                      }
                      value={(getSimilarityValues().mirna_similarity * 100).toFixed(1)}
                      suffix="%"
                      valueStyle={{ color: getSimilarityLevel(getSimilarityValues().mirna_similarity).color }}
                    />
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      {t(
                        '基于 RGMI 模型的疾病嵌入向量余弦相似度',
                        'Based on RGMI model disease embedding cosine similarity'
                      )}
                    </Paragraph>
                  </Card>
                </Col>

                <Col span={8}>
                  <Card className="metric-card">
                    <Statistic
                      title={
                        <Space>
                          <span>{t('基因交互重合度', 'Gene Overlap')}</span>
                          <Tag color={getSimilarityLevel(getSimilarityValues().gene_overlap).color}>
                            {getSimilarityLevel(getSimilarityValues().gene_overlap).text}
                          </Tag>
                        </Space>
                      }
                      value={(getSimilarityValues().gene_overlap * 100).toFixed(1)}
                      suffix="%"
                      valueStyle={{ color: getSimilarityLevel(getSimilarityValues().gene_overlap).color }}
                    />
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      {t(
                        '基于 GDFM 模型的基因交互网络重合度',
                        'Based on GDFM model gene interaction network overlap'
                      )}
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* 说明信息 */}
            <Alert
              message={
                <Space>
                  <InfoCircleOutlined />
                  <span>{t('分析说明', 'Analysis Notes')}</span>
                </Space>
              }
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    {t(
                      '本分析采用三个维度评估疾病相似性：',
                      'This analysis evaluates disease similarity across three dimensions:'
                    )}
                  </Paragraph>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>
                      {t(
                        '表型维度：使用 HPO (Human Phenotype Ontology) 本体论计算症状语义相似度',
                        'Phenotype: HPO semantic similarity for symptom comparison'
                      )}
                    </li>
                    <li>
                      {t(
                        'miRNA 维度：基于 RGMI 模型生成的疾病嵌入向量计算余弦相似度',
                        'miRNA: Cosine similarity of RGMI model disease embeddings'
                      )}
                    </li>
                    <li>
                      {t(
                        '基因维度：使用 GDFM (CIKM\'21) 模型分析基因交互网络的重合程度',
                        'Gene: GDFM model analysis of gene interaction network overlap'
                      )}
                    </li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 24 }}
            />
          </>
        )}

        {!comparisonData && !loading && (
          <Alert
            message={t('请选择要对比的疾病', 'Please select a disease to compare')}
            type="warning"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default DiseaseRadarComparison;
