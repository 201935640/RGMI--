import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, Row, Col, Spin, Empty } from 'antd';
import './RadarChart.css';

/**
 * 雷达图组件 - 展示疾病在不同维度上的特征
 * Radar Chart Component - Displays disease characteristics in different dimensions
 */
const RadarChart = ({ disease, relatedDiseases, geneData, miRNAs, language = 'zh' }) => {
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 计算疾病相关性得分
  const calculateDiseaseRelatedness = () => {
    if (!relatedDiseases || relatedDiseases.length === 0) return 0;
    
    // 获取前5个相似疾病的平均相似度
    const topDiseases = [...relatedDiseases]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    if (topDiseases.length === 0) return 0;
    
    const avgSimilarity = topDiseases.reduce((sum, d) => sum + d.similarity, 0) / topDiseases.length;
    return Math.min(avgSimilarity * 100, 100); // 转换为百分比并限制最大值为100
  };

  // 计算基因重要性得分
  const calculateGeneImportance = () => {
    if (!geneData || geneData.length === 0) return 0;
    
    // 获取前10个基因的平均相关性
    const topGenes = [...geneData]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    if (topGenes.length === 0) return 0;
    
    const avgScore = topGenes.reduce((sum, gene) => sum + gene.score, 0) / topGenes.length;
    return Math.min(avgScore * 100, 100); // 转换为百分比并限制最大值为100
  };

  // 计算miRNA重要性得分
  const calculateMiRNAImportance = () => {
    if (!miRNAs || miRNAs.length === 0) return 0;
    
    // 获取前8个miRNA的平均相关性
    const topMiRNAs = [...miRNAs]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    
    if (topMiRNAs.length === 0) return 0;
    
    const avgScore = topMiRNAs.reduce((sum, mirna) => sum + mirna.score, 0) / topMiRNAs.length;
    return Math.min(avgScore * 100, 100); // 转换为百分比并限制最大值为100
  };

  // 计算基因数量得分
  const calculateGeneAbundance = () => {
    if (!geneData || geneData.length === 0) return 0;
    
    // 基于基因数量计算丰富度得分，最高100分（对应20个或更多基因）
    const geneCount = geneData.length;
    return Math.min(geneCount * 5, 100); // 每个基因贡献5分，最高100分
  };

  // 计算miRNA数量得分
  const calculateMiRNAAbundance = () => {
    if (!miRNAs || miRNAs.length === 0) return 0;
    
    // 基于miRNA数量计算丰富度得分，最高100分（对应15个或更多miRNA）
    const mirnaCount = miRNAs.length;
    return Math.min(mirnaCount * 6.67, 100); // 每个miRNA贡献约6.67分，最高100分
  };

  // 计算疾病研究热度得分
  const calculateResearchHeat = () => {
    // 综合考虑相关疾病、基因和miRNA的数量来估计研究热度
    const relatedDiseaseCount = relatedDiseases ? relatedDiseases.length : 0;
    const geneCount = geneData ? geneData.length : 0;
    const mirnaCount = miRNAs ? miRNAs.length : 0;
    
    // 加权计算研究热度得分
    const weightedScore = (relatedDiseaseCount * 3 + geneCount * 2 + mirnaCount * 2) / 7;
    
    // 转换为百分比，假设最高参考值为20
    return Math.min(weightedScore * 5, 100);
  };

  // 生成图表数据
  const getChartOptions = () => {
    const diseaseRelatedness = calculateDiseaseRelatedness() || 10; // 基础值为10
    const geneImportance = calculateGeneImportance() || 15; // 基础值为15
    const miRNAImportance = calculateMiRNAImportance() || 12; // 基础值为12
    const geneAbundance = calculateGeneAbundance() || 20; // 基础值为20
    const miRNAAbundance = calculateMiRNAAbundance() || 18; // 基础值为18
    const researchHeat = calculateResearchHeat() || 25; // 基础值为25

    return {
      title: {
        text: t('疾病特征雷达图', 'Disease Feature Radar Chart'),
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      radar: {
        shape: 'polygon',
        indicator: [
          { name: t('疾病相关性', 'Disease Relatedness'), max: 100 },
          { name: t('基因重要性', 'Gene Importance'), max: 100 },
          { name: t('miRNA重要性', 'miRNA Importance'), max: 100 },
          { name: t('基因丰富度', 'Gene Abundance'), max: 100 },
          { name: t('miRNA丰富度', 'miRNA Abundance'), max: 100 },
          { name: t('研究热度', 'Research Heat'), max: 100 }
        ],
        radius: '65%'
      },
      series: [
        {
          name: t('特征值', 'Feature Values'),
          type: 'radar',
          data: [
            {
              value: [
                diseaseRelatedness,
                geneImportance,
                miRNAImportance,
                geneAbundance,
                miRNAAbundance,
                researchHeat
              ],
              name: disease?.name || t('当前疾病', 'Current Disease'),
              areaStyle: {
                color: 'rgba(211, 84, 0, 0.4)'
              },
              lineStyle: {
                color: '#d35400',
                width: 2
              },
              itemStyle: {
                color: '#d35400'
              }
            }
          ]
        }
      ]
    };
  };

  useEffect(() => {
    // 确保DOM元素存在且有疾病数据
    if (chartRef.current && disease) {
      try {
        setLoading(true);
        
        // 如果图表实例已存在，销毁它
        if (chart) {
          chart.dispose();
        }
        
        // 初始化新的图表实例
        const newChart = echarts.init(chartRef.current);
        setChart(newChart);
        
        // 立即设置图表选项
        newChart.setOption(getChartOptions());
        
        // 处理窗口大小变化
        const handleResize = () => {
          newChart.resize();
        };
        
        window.addEventListener('resize', handleResize);
        
        // 完成加载
        setLoading(false);
        
        // 清理函数
        return () => {
          window.removeEventListener('resize', handleResize);
          newChart.dispose();
        };
      } catch (error) {
        console.error('图表初始化错误:', error);
        setLoading(false);
      }
    }
  }, [disease, relatedDiseases, geneData, miRNAs, language]);

  // 创建图表描述
  const renderChartDescription = () => {
    return (
      <div className="radar-chart-description">
        <h4>{t('雷达图指标说明', 'Radar Chart Indicators')}</h4>
        <ul>
          <li>
            <strong>{t('疾病相关性', 'Disease Relatedness')}:</strong> {t('衡量该疾病与其他疾病的相似程度', 'Measures the similarity between this disease and other diseases')}
          </li>
          <li>
            <strong>{t('基因重要性', 'Gene Importance')}:</strong> {t('与疾病相关的基因的平均重要性得分', 'Average importance score of genes associated with the disease')}
          </li>
          <li>
            <strong>{t('miRNA重要性', 'miRNA Importance')}:</strong> {t('与疾病相关的miRNA的平均重要性得分', 'Average importance score of miRNAs associated with the disease')}
          </li>
          <li>
            <strong>{t('基因丰富度', 'Gene Abundance')}:</strong> {t('与疾病相关联的基因数量', 'Number of genes associated with the disease')}
          </li>
          <li>
            <strong>{t('miRNA丰富度', 'miRNA Abundance')}:</strong> {t('与疾病相关联的miRNA数量', 'Number of miRNAs associated with the disease')}
          </li>
          <li>
            <strong>{t('研究热度', 'Research Heat')}:</strong> {t('基于相关实体数量的疾病研究程度估计', 'Estimate of disease research intensity based on the number of related entities')}
          </li>
        </ul>
      </div>
    );
  };

  return (
    <Card 
      title={t('疾病特征雷达分析', 'Disease Feature Radar Analysis')} 
      className="radar-chart-card"
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          {loading ? (
            <div className="chart-loading-container">
              <Spin tip={t('正在加载图表数据...', 'Loading chart data...')} />
            </div>
          ) : disease ? (
            <>
              <div ref={chartRef} style={{ height: '350px', width: '100%' }} />
              {renderChartDescription()}
            </>
          ) : (
            <Empty 
              description={t('暂无雷达图数据', 'No radar chart data available')} 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default RadarChart; 