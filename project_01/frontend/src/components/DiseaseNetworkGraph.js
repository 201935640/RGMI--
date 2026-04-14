import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Slider, Radio, Switch, Space, Tooltip, Button, Alert, Spin } from 'antd';
import { QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import './DiseaseNetworkGraph.css';

/**
 * 疾病网络图组件 - 可视化疾病和相关疾病之间的关系
 * Disease Network Graph Component - Visualizes relationships between a disease and related diseases
 */
const DiseaseNetworkGraph = ({ disease, relatedDiseases, onNodeClick, language = 'zh' }) => {
  // 状态变量
  const [similarityThreshold, setSimilarityThreshold] = useState(0.2);
  const [layoutType, setLayoutType] = useState('force');
  const [showLabels, setShowLabels] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 处理组件错误
  const handleError = (error, message) => {
    console.error(`DiseaseNetworkGraph Error: ${message}`, error);
    setError(`${message}: ${error.message}`);
  };
  
  // 重新应用布局
  const refreshLayout = () => {
    if (chartRef.current && chartRef.current.getEchartsInstance) {
      try {
        const chart = chartRef.current.getEchartsInstance();
        chart.setOption({
          series: [{
            name: t('疾病网络', 'Disease Network'),
            roam: true,
            zoom: 1.1
          }]
        });
      } catch (error) {
        handleError(error, '重置图表时出错');
      }
    }
  };

  // 在阈值更改时重新渲染图表
  useEffect(() => {
    refreshLayout();
  }, [similarityThreshold, layoutType, showLabels]);
  
  // 确保当疾病或相关疾病更改时更新图表
  useEffect(() => {
      setLoading(true);
    try {
      // 处理数据
      setError(null);
      
      // 延迟一点点以允许UI更新
      setTimeout(() => {
        setLoading(false);
      }, 300);
    } catch (error) {
      handleError(error, t(
        '处理疾病网络数据时出错',
        'Error processing disease network data'
      ));
      setLoading(false);
    }
  }, [disease, relatedDiseases]);

  // 处理疾病节点点击
  const onChartClick = (params) => {
    try {
      // 只处理节点点击事件
      if (params.componentType === 'series' && params.dataType === 'node') {
        if (typeof onNodeClick === 'function' && params.data.id !== disease.disease_id) {
          // 获取关联疾病数据
          const clickedDisease = relatedDiseases.find(d => d.disease_id === params.data.id);
          if (clickedDisease) {
            onNodeClick(clickedDisease);
          }
        }
      }
    } catch (error) {
      handleError(error, t(
        '处理节点点击事件时出错',
        'Error handling node click event'
      ));
    }
  };

  // 图表事件处理
  const onEvents = {
    'click': onChartClick
  };

  // 获取图表配置
  const getChartOption = () => {
    try {
    if (!disease || !relatedDiseases || relatedDiseases.length === 0) {
      return {
        title: {
          text: t('暂无数据', 'No Data Available'),
          left: 'center',
          top: 'center'
        }
      };
    }

    // 构建节点数据
    const nodes = [];
    const links = [];
    
    // 添加中心疾病节点
    nodes.push({
      id: disease.disease_id,
      name: disease.name,
      symbolSize: 50,
      value: 1,
      category: 0,
      label: {
        show: true
      },
      itemStyle: {
        color: '#c23531'
      }
    });
    
    // 添加相关疾病节点
    relatedDiseases.forEach(rd => {
      if (!rd) return;
      
      const similarity = typeof rd.similarity === 'number' ? 
        rd.similarity : (rd.similarity ? parseFloat(rd.similarity) : 0);
      
      // 根据相似度阈值过滤
      if (similarity < similarityThreshold) return;
      
      // 添加节点
      nodes.push({
        id: rd.disease_id,
        name: rd.name,
        symbolSize: 30 + similarity * 20,
        value: similarity,
        category: 1,
        label: {
          show: showLabels
        },
        itemStyle: {
          color: getNodeColor(similarity)
        }
      });
      
      // 添加连接
      links.push({
        source: disease.disease_id,
        target: rd.disease_id,
        value: similarity,
        label: {
          show: false,
          formatter: '{c}'
        },
        lineStyle: {
          width: similarity * 5,
          color: getLinkColor(similarity)
        }
      });
    });
    
    // 计算推荐缩放比例 - 根据节点数量调整
    const zoomRatio = nodes.length > 20 ? 0.8 : 
                      nodes.length > 10 ? 1 : 
                      nodes.length > 5 ? 1.2 : 1.5;
    
    return {
      title: {
        text: t('疾病相似性网络', 'Disease Similarity Network'),
        subtext: t(
          `中心节点: ${disease.name || disease.disease_id}`, 
          `Central Node: ${disease.name || disease.disease_id}`
        ),
        left: 'center',
        top: 0
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'node') {
            return `
              <div class="tooltip-item">
                <div class="tooltip-title">${params.data.name || params.data.id}</div>
                <div class="tooltip-id">${t('ID', 'ID')}: ${params.data.id}</div>
                ${params.data.value !== undefined ? `<div class="tooltip-value">${t('相似度', 'Similarity')}: ${params.data.value.toFixed(4)}</div>` : ''}
              </div>
            `;
          } else if (params.dataType === 'edge') {
            return `
              <div class="tooltip-item">
                <div class="tooltip-title">${t('疾病相似性', 'Disease Similarity')}</div>
                <div class="tooltip-value">${params.data.value.toFixed(4)}</div>
              </div>
            `;
          }
        }
      },
      legend: {
        data: [
          t('中心疾病', 'Central Disease'),
          t('相关疾病', 'Related Diseases')
        ],
        orient: 'horizontal',
        bottom: 10
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: t('疾病网络', 'Disease Network'),
          type: 'graph',
          layout: layoutType,
          data: nodes,
          links: links,
          categories: [
            { name: t('中心疾病', 'Central Disease') },
            { name: t('相关疾病', 'Related Diseases') }
          ],
          roam: true,
          zoom: zoomRatio,
          focusNodeAdjacency: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          label: {
            position: 'right',
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          emphasis: {
            lineStyle: {
              width: 6
            }
          },
          force: {
            repulsion: 350,
            gravity: 0.1,
            edgeLength: 150,
            friction: 0.6
          },
          circular: {
            rotateLabel: true
          }
        }
      ]
    };
    } catch (error) {
      handleError(error, '生成图表选项时出错');
      return {
        title: {
          text: t('生成图表时出错', 'Error Generating Chart'),
          left: 'center',
          top: 'center'
        }
      };
    }
  };

  // 根据相似度获取节点颜色
  const getNodeColor = (similarity) => {
    if (similarity > 0.8) return '#27ae60'; // 高相似度 - 绿色
    if (similarity > 0.6) return '#2980b9'; // 中高相似度 - 蓝色
    if (similarity > 0.4) return '#8e44ad'; // 中等相似度 - 紫色
    if (similarity > 0.2) return '#f39c12'; // 低相似度 - 橙色
    return '#95a5a6'; // 极低相似度 - 灰色
  };

  // 根据相似度获取连接颜色
  const getLinkColor = (similarity) => {
    if (similarity > 0.8) return 'rgba(39, 174, 96, 0.7)';
    if (similarity > 0.6) return 'rgba(41, 128, 185, 0.7)';
    if (similarity > 0.4) return 'rgba(142, 68, 173, 0.7)';
    if (similarity > 0.2) return 'rgba(243, 156, 18, 0.7)';
    return 'rgba(149, 165, 166, 0.5)';
  };

  // 如果有错误，显示错误消息
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('图表错误', 'Chart Error')}
        description={error}
        action={
          <Button 
            type="primary" 
            size="small" 
            onClick={() => refreshLayout()}
          >
            {t('重试', 'Retry')}
          </Button>
        }
      />
    );
  }

  // 如果正在加载，显示加载动画
  if (loading) {
    return (
      <div className="disease-network-loading">
        <Spin tip={t("加载中...", "Loading...")} />
      </div>
    );
  }

  return (
    <div className="disease-network-graph-container">
      {/* 控制面板 */}
      <Card
                size="small"
        className="network-controls-card"
        title={t('网络控制', 'Network Controls')}
      >
        <div className="control-row">
          <div className="control-label">
            {t('相似度阈值', 'Similarity Threshold')}
            <Tooltip title={t(
              '仅显示相似度高于此阈值的疾病',
              'Only show diseases with similarity above this threshold'
            )}>
              <QuestionCircleOutlined className="help-icon" />
            </Tooltip>
          </div>
            <Slider
              min={0}
            max={1}
            step={0.05}
              value={similarityThreshold}
              onChange={setSimilarityThreshold}
            marks={{
              0: '0',
              0.5: '0.5',
              1: '1'
            }}
            />
          </div>
          
        <div className="control-row">
          <div className="control-label">
            {t('布局类型', 'Layout Type')}
          </div>
          <Radio.Group 
            value={layoutType} 
            onChange={e => setLayoutType(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="force">{t('力导向', 'Force')}</Radio.Button>
            <Radio.Button value="circular">{t('环形', 'Circular')}</Radio.Button>
          </Radio.Group>
        </div>
        
        <div className="control-row">
          <div className="control-label">
            {t('显示标签', 'Show Labels')}
          </div>
            <Switch
              checked={showLabels}
              onChange={setShowLabels}
            />
          </div>
          
        <div className="control-row">
              <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshLayout}
                size="small" 
              >
            {t('重置视图', 'Reset View')}
              </Button>
        </div>
      </Card>
        
      {/* 图表 */}
        <div className="network-chart-container">
            <ReactECharts
              ref={chartRef}
              option={getChartOption()}
              style={{ height: '500px', width: '100%' }}
          onEvents={onEvents}
          notMerge={true}
        />
      </div>
      
      {/* 图例说明 */}
      <div className="legend-description">
        <div className="legend-item central">
          <span className="legend-color"></span>
          <span className="legend-text">{t('中心疾病', 'Central Disease')}</span>
        </div>
        
        <div className="legend-item related-high">
          <span className="legend-color"></span>
          <span className="legend-text">{t('高相似度 (>0.8)', 'High Similarity (>0.8)')}</span>
        </div>
        
        <div className="legend-item related-medium">
          <span className="legend-color"></span>
          <span className="legend-text">{t('中等相似度 (0.4-0.8)', 'Medium Similarity (0.4-0.8)')}</span>
        </div>
        
        <div className="legend-item related-low">
          <span className="legend-color"></span>
          <span className="legend-text">{t('低相似度 (<0.4)', 'Low Similarity (<0.4)')}</span>
        </div>
      </div>
    </div>
  );
};

export default DiseaseNetworkGraph; 