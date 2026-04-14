import React, { useState, useEffect, useRef } from 'react';
import { Card, Slider, Select, Switch, Button, Radio, Tooltip, Input, Empty, Spin, message } from 'antd';
import { 
  FullscreenOutlined, 
  DownloadOutlined, 
  ReloadOutlined, 
  SearchOutlined,
  SettingOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { useTranslation } from 'react-i18next';
import './DiseaseSimilarityGraph.css'; // 复用原有样式

const { Option } = Select;

/**
 * 疾病相似性网络图组件
 * 
 * @param {Object} props
 * @param {Array} props.diseaseData - 所有疾病数据
 * @param {Object} props.selectedDisease - 当前选中的疾病
 * @param {Function} props.onSelectDisease - 疾病选择回调
 * @param {Object} props.settings - 图表设置
 * @param {Boolean} props.loading - 加载状态
 */
const NewDiseaseSimilarityGraph = ({
  diseaseData = [],
  selectedDisease = null,
  onSelectDisease,
  settings = {
    defaultSimilarityThreshold: 0.3,
    maxNodeCount: 100,
    defaultLayout: 'force',
    enableAnimation: true
  },
  loading = false
}) => {
  // 状态变量
  const [chartInstance, setChartInstance] = useState(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.defaultSimilarityThreshold);
  const [maxNodes, setMaxNodes] = useState(settings.maxNodeCount);
  const [layoutType, setLayoutType] = useState(settings.defaultLayout);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enableAnimation, setEnableAnimation] = useState(settings.enableAnimation);
  const [nodeSize, setNodeSize] = useState(20);
  const [diseasesShown, setDiseasesShown] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDiseases, setFilteredDiseases] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);

  // refs
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const { t } = useTranslation();

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 销毁现有实例
    if (chartInstance) {
      chartInstance.dispose();
    }

    // 创建新图表实例
    const newChart = echarts.init(chartRef.current);
    setChartInstance(newChart);

    // 监听窗口大小变化以调整图表大小
    const handleResize = () => newChart.resize();
    window.addEventListener('resize', handleResize);

    // 监听点击事件
    newChart.on('click', 'series.graph.nodes', (params) => {
      const disease = params.data.originalData;
      if (disease && onSelectDisease) {
        onSelectDisease(disease);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      newChart.dispose();
    };
  }, []);

  // 当选中的疾病变化时，更新图表数据
  useEffect(() => {
    if (!selectedDisease || !chartInstance) return;
    
    fetchAndUpdateGraph(selectedDisease.disease_id);
  }, [selectedDisease, chartInstance]);

  // 当图表设置变化时，更新图表
  useEffect(() => {
    if (!graphData || !chartInstance) return;

    renderGraph();
  }, [similarityThreshold, layoutType, enableAnimation, nodeSize, graphData, maxNodes]);

  // 全屏模式处理
  useEffect(() => {
    const toggleFullscreen = () => {
      if (isFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
      } else if (isFullscreen && containerRef.current) {
        containerRef.current.requestFullscreen().catch(err => {
          message.error(`全屏模式出错: ${err.message}`);
        });
      }
    };

    toggleFullscreen();
  }, [isFullscreen]);

  // 搜索过滤处理
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredDiseases([]);
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);
    const results = diseaseData.filter(disease => {
      const term = searchTerm.toLowerCase();
      return (
        disease.disease_id.toLowerCase().includes(term) || 
        disease.name.toLowerCase().includes(term)
      );
    }).slice(0, 15);

    setFilteredDiseases(results);
  }, [searchTerm, diseaseData]);

  // 获取疾病相似性数据并更新图表
  const fetchAndUpdateGraph = async (diseaseId) => {
    try {
      // 在实际应用中，这里应该从API获取数据
      // 这里我们模拟从selectedDisease中获取related_diseases数据
      if (selectedDisease && selectedDisease.related_diseases) {
        setGraphData({
          target: selectedDisease,
          related: selectedDisease.related_diseases
        });
      } else {
        // 使用模拟数据
        const mockRelated = diseaseData
          .filter(d => d.disease_id !== diseaseId)
          .slice(0, 20)
          .map(d => ({
            ...d,
            similarity: Math.random() * 0.8 + 0.2 // 0.2 到 1.0 之间的随机值
          }));
        
        setGraphData({
          target: selectedDisease,
          related: mockRelated
        });
      }
    } catch (error) {
      console.error('获取疾病相似性数据失败:', error);
      message.error(t('failedToLoadSimilarityData'));
    }
  };

  // 渲染网络图
  const renderGraph = () => {
    if (!chartInstance || !graphData) return;

    const { target, related } = graphData;
    
    // 根据相似性阈值和最大节点数过滤相关疾病
    const filteredRelated = related
      .filter(disease => disease.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxNodes);

    // 更新显示的疾病数量
    setDiseasesShown(filteredRelated.length + 1); // +1 表示目标疾病

    // 准备节点数据
    const nodes = [
      {
        name: target.name,
        value: 1,
        symbolSize: nodeSize * 1.5,
        category: 0,
        itemStyle: {
          color: '#26d0ce'
        },
        label: {
          show: true
        },
        originalData: target
      },
      ...filteredRelated.map((disease, index) => ({
        name: disease.name,
        value: disease.similarity,
        symbolSize: nodeSize * disease.similarity,
        category: 1,
        itemStyle: {
          color: getColorByScore(disease.similarity)
        },
        label: {
          show: disease.similarity > 0.7
        },
        originalData: disease
      }))
    ];

    // 准备边数据
    const links = filteredRelated.map(disease => ({
      source: target.name,
      target: disease.name,
      value: disease.similarity,
      lineStyle: {
        width: disease.similarity * 3,
        color: getColorByScore(disease.similarity, 0.5)
      }
    }));

    // 配置图表选项
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.dataType === 'node') {
            const disease = params.data.originalData;
            return `
              <div class="chart-tooltip">
                <div class="tooltip-title">${disease.name}</div>
                <div class="tooltip-id">${disease.disease_id}</div>
                ${params.data.category === 1 ? 
                  `<div class="tooltip-similarity">相似度: ${(disease.similarity * 100).toFixed(2)}%</div>` : ''}
              </div>
            `;
          } else if (params.dataType === 'edge') {
            return `相似度: ${(params.value * 100).toFixed(2)}%`;
          }
          return '';
        }
      },
      legend: {
        data: [t('targetDisease'), t('similarDiseases')],
        orient: 'horizontal',
        top: 10,
        right: 10
      },
      animationDuration: enableAnimation ? 1500 : 0,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: t('diseaseSimilarityNetwork'),
          type: 'graph',
          layout: layoutType,
          force: {
            repulsion: 300,
            gravity: 0.1,
            edgeLength: 150,
            layoutAnimation: enableAnimation
          },
          circular: {
            rotateLabel: true
          },
          data: nodes,
          links: links,
          categories: [
            {
              name: t('targetDisease')
            }, 
            {
              name: t('similarDiseases')
            }
          ],
          roam: true,
          zoom: 1,
          label: {
            position: 'right',
            show: true,
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 5
            },
            label: {
              show: true
            }
          }
        }
      ]
    };

    // 设置图表选项
    chartInstance.setOption(option);
  };

  // 根据相似性分数获取颜色
  const getColorByScore = (score, alpha = 1) => {
    let color;
    if (score >= 0.8) {
      color = `rgba(41, 147, 85, ${alpha})`; // 绿色
    } else if (score >= 0.6) {
      color = `rgba(63, 169, 95, ${alpha})`; // 浅绿色
    } else if (score >= 0.4) {
      color = `rgba(255, 170, 0, ${alpha})`; // 橙色
    } else if (score >= 0.2) {
      color = `rgba(255, 130, 0, ${alpha})`; // 橙红色
    } else {
      color = `rgba(239, 83, 80, ${alpha})`; // 红色
    }
    return color;
  };

  // 重置图表
  const resetChart = () => {
    if (chartInstance) {
      chartInstance.dispatchAction({
        type: 'restore'
      });
    }
  };

  // 导出图表为图片
  const exportChart = () => {
    if (chartInstance) {
      const url = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      const link = document.createElement('a');
      link.download = `disease-similarity-${selectedDisease?.disease_id || 'network'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 放大图表
  const zoomIn = () => {
    if (chartInstance) {
      const currentZoom = chartInstance.getOption().series[0].zoom;
      chartInstance.setOption({
        series: [{ zoom: currentZoom * 1.2 }]
      });
    }
  };

  // 缩小图表
  const zoomOut = () => {
    if (chartInstance) {
      const currentZoom = chartInstance.getOption().series[0].zoom;
      chartInstance.setOption({
        series: [{ zoom: currentZoom * 0.8 }]
      });
    }
  };

  // 处理疾病选择
  const handleDiseaseSelect = (value) => {
    const disease = diseaseData.find(d => d.disease_id === value);
    if (disease && onSelectDisease) {
      onSelectDisease(disease);
      setSearchTerm('');
    }
  };

  // 渲染图表控制面板
  const renderControls = () => (
    <div className="graph-controls">
      <div className="control-group search-group">
        <Input
          className="disease-search-input"
          placeholder={t('searchDisease')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          suffix={<SearchOutlined />}
        />
        {isFiltering && filteredDiseases.length > 0 && (
          <div className="search-dropdown">
            <ul className="search-results">
              {filteredDiseases.map(disease => (
                <li 
                  key={disease.disease_id} 
                  onClick={() => handleDiseaseSelect(disease.disease_id)}
                  className="search-result-item"
                >
                  <NodeIndexOutlined /> {disease.name}
                  <div className="search-result-id">{disease.disease_id}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="control-group setting-group">
        <div className="control-item">
          <label>{t('similarityThreshold')}</label>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={similarityThreshold}
            onChange={setSimilarityThreshold}
            tipFormatter={value => `${(value * 100).toFixed(0)}%`}
          />
        </div>

        <div className="control-item">
          <label>{t('maxNodes')}</label>
          <Slider
            min={5}
            max={100}
            step={5}
            value={maxNodes}
            onChange={setMaxNodes}
          />
        </div>

        <div className="control-item">
          <label>{t('nodeSize')}</label>
          <Slider
            min={10}
            max={40}
            step={2}
            value={nodeSize}
            onChange={setNodeSize}
          />
        </div>

        <div className="control-item">
          <label>{t('layout')}</label>
          <Radio.Group
            value={layoutType}
            onChange={e => setLayoutType(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="force">{t('forceLayout')}</Radio.Button>
            <Radio.Button value="circular">{t('circularLayout')}</Radio.Button>
          </Radio.Group>
        </div>

        <div className="control-item">
          <label>{t('animation')}</label>
          <Switch 
            checked={enableAnimation} 
            onChange={setEnableAnimation}
          />
        </div>
      </div>

      <div className="control-group action-group">
        <Tooltip title={t('fullscreen')}>
          <Button 
            icon={<FullscreenOutlined />} 
            onClick={() => setIsFullscreen(!isFullscreen)}
          />
        </Tooltip>
        <Tooltip title={t('zoomIn')}>
          <Button 
            icon={<ZoomInOutlined />} 
            onClick={zoomIn}
          />
        </Tooltip>
        <Tooltip title={t('zoomOut')}>
          <Button 
            icon={<ZoomOutOutlined />} 
            onClick={zoomOut}
          />
        </Tooltip>
        <Tooltip title={t('reset')}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={resetChart}
          />
        </Tooltip>
        <Tooltip title={t('exportImage')}>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={exportChart}
          />
        </Tooltip>
      </div>
    </div>
  );

  // 渲染图表信息面板
  const renderInfoPanel = () => (
    <div className="graph-info-panel">
      <div className="info-item">
        <span className="info-label">{t('targetDisease')}:</span>
        <span className="info-value">{selectedDisease?.name || '-'}</span>
      </div>
      <div className="info-item">
        <span className="info-label">{t('shownDiseases')}:</span>
        <span className="info-value">{diseasesShown}</span>
      </div>
      <div className="info-item">
        <span className="info-label">{t('threshold')}:</span>
        <span className="info-value">{(similarityThreshold * 100).toFixed(0)}%</span>
      </div>
    </div>
  );

  // 主渲染函数
  return (
    <div 
      className={`disease-similarity-graph-container ${isFullscreen ? 'fullscreen' : ''}`}
      ref={containerRef}
    >
      <div className="graph-header">
        <h2 className="graph-title">
          <NodeIndexOutlined /> {t('diseaseSimilarityNetwork')}
        </h2>
        <div className="graph-subtitle">
          {selectedDisease ? 
            t('networkForDisease', { disease: selectedDisease.name }) : 
            t('selectDisease')}
        </div>
      </div>

      {renderControls()}

      <div className="graph-content">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" tip={t('loading')} />
          </div>
        ) : !selectedDisease ? (
          <div className="empty-graph">
            <Empty 
              description={t('noDiseaseSelected')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <div className="empty-instruction">
              {t('pleaseSelectDisease')}
            </div>
          </div>
        ) : (
          <>
            <div 
              className="chart-container"
              ref={chartRef}
              style={{ height: isFullscreen ? '85vh' : '60vh' }}
            ></div>
            {renderInfoPanel()}
          </>
        )}
      </div>
    </div>
  );
};

export default NewDiseaseSimilarityGraph; 