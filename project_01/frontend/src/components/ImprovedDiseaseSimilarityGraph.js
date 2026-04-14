import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Slider, Select, Switch, Button, Radio, Tooltip, Input, Empty, 
  Spin, message, Collapse, Space, Tag, Divider, Popover, Badge
} from 'antd';
import { 
  FullscreenOutlined, DownloadOutlined, ReloadOutlined, SearchOutlined,
  SettingOutlined, ZoomInOutlined, ZoomOutOutlined, NodeIndexOutlined,
  DatabaseOutlined, AppstoreOutlined, BgColorsOutlined, LinkOutlined,
  InfoCircleOutlined, SaveOutlined, UndoOutlined, EyeOutlined,
  EyeInvisibleOutlined, ClusterOutlined, BarChartOutlined,
  CameraOutlined, ShareAltOutlined, HomeOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import './ImprovedDiseaseSimilarityGraph.css';

const { Option } = Select;
const { Panel } = Collapse;

/**
 * 改进版疾病相似性网络组件
 */
const ImprovedDiseaseSimilarityGraph = ({
  diseaseData = [],
  selectedDisease = null,
  onSelectDisease,
  settings = {
    defaultSimilarityThreshold: 0.4,
    maxNodeCount: 30,
    defaultLayout: 'force',
    enableAnimation: true
  },
  loading = false
}) => {
  // 图表实例和引用
  const [chartInstance, setChartInstance] = useState(null);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  // 网络设置状态
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.defaultSimilarityThreshold);
  const [maxNodes, setMaxNodes] = useState(settings.maxNodeCount);
  const [layoutType, setLayoutType] = useState(settings.defaultLayout);
  const [nodeSize, setNodeSize] = useState(20);
  const [edgeWidth, setEdgeWidth] = useState(2);
  const [showLabels, setShowLabels] = useState(true);
  const [labelSize, setLabelSize] = useState(12);
  const [repulsionForce, setRepulsionForce] = useState(300);
  const [gravityForce, setGravityForce] = useState(0.1);
  const [edgeLength, setEdgeLength] = useState(150);
  const [colorScheme, setColorScheme] = useState('similarity'); // similarity, category, type
  const [enableAnimation, setEnableAnimation] = useState(settings.enableAnimation);
  const [renderQuality, setRenderQuality] = useState('medium'); // low, medium, high
  const [autoRotate, setAutoRotate] = useState(false);
  const [edgeCurveness, setEdgeCurveness] = useState(0.3);
  const [edgeBundling, setEdgeBundling] = useState(false);
  
  // 视图状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diseasesShown, setDiseasesShown] = useState(0);
  const [edgesShown, setEdgesShown] = useState(0);
  const [avgSimilarity, setAvgSimilarity] = useState(0);
  const [viewMode, setViewMode] = useState('standard'); // standard, focused, expanded
  const [snapshots, setSnapshots] = useState([]);
  
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDiseases, setFilteredDiseases] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // 数据状态
  const [graphData, setGraphData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance) {
      chartInstance.dispose();
    }

    const newChart = echarts.init(chartRef.current);
    setChartInstance(newChart);

    const handleResize = () => newChart.resize();
    window.addEventListener('resize', handleResize);

    // 添加点击事件监听
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
  }, [
    similarityThreshold, layoutType, nodeSize, edgeWidth, showLabels,
    labelSize, repulsionForce, gravityForce, edgeLength, colorScheme,
    enableAnimation, renderQuality, autoRotate, edgeCurveness,
    edgeBundling, graphData, maxNodes, viewMode
  ]);

  // 处理全屏模式
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
      setIsProcessing(true);
      
      // 直接使用后端提供的数据
      if (selectedDisease && selectedDisease.related_diseases && selectedDisease.related_diseases.length > 0) {
        // 使用后端已经提供的相关疾病数据
        setGraphData({
          target: selectedDisease,
          related: selectedDisease.related_diseases
        });
        
        console.log(`已加载疾病 ${diseaseId} 的 ${selectedDisease.related_diseases.length} 个相关疾病数据`);
      } else {
        // 如果后端未提供相关疾病数据，显示提示信息
        message.info('当前疾病没有相关疾病数据');
        
        // 设置空数据
        setGraphData({
          target: selectedDisease,
          related: []
        });
      }
    } catch (error) {
      console.error('获取疾病相似性数据失败:', error);
      message.error('无法加载疾病相似性数据');
    } finally {
      setIsProcessing(false);
    }
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

  // 渲染网络图
  const renderGraph = () => {
    if (!chartInstance || !graphData) return;

    const { target, related } = graphData;
    setIsProcessing(true);
    
    try {
      // 检查相关疾病数据是否包含必要的属性
      const validRelated = related.filter(disease => {
        // 确保每个疾病对象都有必要的属性
        return disease && 
               disease.disease_id && 
               disease.name && 
               typeof disease.similarity === 'number';
      });
      
      if (validRelated.length === 0) {
        // 如果没有有效的相关疾病数据
        chartInstance.setOption({
          title: {
            show: true,
            text: '没有符合条件的相关疾病数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              fontSize: 16,
              color: '#999'
            }
          }
        });
        
        setDiseasesShown(1); // 只有目标疾病
        setEdgesShown(0);
        setAvgSimilarity(0);
        setIsProcessing(false);
        return;
      }
      
      // 根据相似性阈值和最大节点数过滤相关疾病
      const filteredRelated = validRelated
        .filter(disease => disease.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxNodes);

      // 更新统计数据
      setDiseasesShown(filteredRelated.length + 1); // +1 表示目标疾病
      setEdgesShown(filteredRelated.length);
      
      // 计算平均相似度
      if (filteredRelated.length > 0) {
        const totalSimilarity = filteredRelated.reduce((sum, d) => sum + d.similarity, 0);
        setAvgSimilarity(totalSimilarity / filteredRelated.length);
      } else {
        setAvgSimilarity(0);
        
        // 如果过滤后没有疾病数据，显示提示信息
        chartInstance.setOption({
          title: {
            show: true,
            text: `没有相似度大于 ${(similarityThreshold * 100).toFixed(0)}% 的疾病`,
            left: 'center',
            top: 'middle',
            textStyle: {
              fontSize: 16,
              color: '#999'
            }
          }
        });
        
        setIsProcessing(false);
        return;
      }

      // 准备节点数据
      const nodes = [
        {
          name: target.name,
          value: 1,
          symbolSize: nodeSize * 1.5,
          category: 0,
          itemStyle: {
            color: '#1a2980'
          },
          label: {
            show: true,
            fontSize: labelSize,
            color: '#1a2980'
          },
          emphasis: {
            scale: true,
            label: {
              show: true,
              color: '#1a2980',
              fontWeight: 'bold'
            }
          },
          originalData: target
        },
        ...filteredRelated.map((disease, index) => {
          let nodeColor;
          
          // 根据颜色方案设置节点颜色
          if (colorScheme === 'similarity') {
            nodeColor = getColorByScore(disease.similarity);
          } else if (colorScheme === 'category') {
            // 根据疾病分类设置不同颜色 (示例)
            const categoryColors = [
              '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
              '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
            ];
            nodeColor = categoryColors[disease.category % categoryColors.length];
          } else {
            // 默认颜色
            nodeColor = '#26d0ce';
          }
          
          return {
            name: disease.name,
            value: disease.similarity,
            symbolSize: nodeSize * disease.similarity,
            category: disease.category || 1,
            itemStyle: {
              color: nodeColor
            },
            label: {
              show: showLabels && disease.similarity > 0.6,
              fontSize: labelSize,
              color: '#333'
            },
            emphasis: {
              scale: true,
              label: {
                show: true,
                fontWeight: 'bold'
              }
            },
            originalData: disease
          };
        })
      ];

      // 准备边数据
      const links = filteredRelated.map(disease => ({
        source: target.name,
        target: disease.name,
        value: disease.similarity,
        lineStyle: {
          width: disease.similarity * edgeWidth,
          color: getColorByScore(disease.similarity, 0.5),
          curveness: edgeCurveness
        },
        emphasis: {
          lineStyle: {
            width: disease.similarity * edgeWidth * 1.5,
            shadowBlur: 5,
            shadowColor: getColorByScore(disease.similarity, 0.7)
          }
        }
      }));

      // 配置图表选项
      const option = {
        title: {
          show: false
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: '#ccc',
          borderWidth: 1,
          padding: 10,
          textStyle: {
            color: '#333'
          },
          formatter: (params) => {
            if (params.dataType === 'node') {
              const disease = params.data.originalData;
              return `
                <div style="font-weight:bold;border-bottom:1px solid #eee;padding-bottom:5px;margin-bottom:5px">
                  ${disease.name}
                </div>
                <div style="font-size:12px;color:#666">ID: ${disease.disease_id}</div>
                ${params.data.category !== 0 ? 
                  `<div style="font-size:12px;margin-top:5px">相似度: 
                    <span style="color:${getColorByScore(disease.similarity)};font-weight:bold">
                      ${(disease.similarity * 100).toFixed(1)}%
                    </span>
                  </div>` : ''}
              `;
            } else if (params.dataType === 'edge') {
              return `<div style="font-size:12px">相似度: <b>${(params.value * 100).toFixed(1)}%</b></div>`;
            }
            return '';
          }
        },
        legend: {
          show: false
        },
        animationDuration: enableAnimation ? 1000 : 0,
        animationEasingUpdate: 'quinticInOut',
        series: [
          {
            name: '疾病相似性网络',
            type: 'graph',
            layout: layoutType,
            data: nodes,
            links: links,
            categories: Array(10).fill(0).map((_, i) => ({ name: `类别 ${i}` })),
            roam: true,
            zoom: 1,
            draggable: true,
            label: {
              position: 'right',
              show: showLabels,
              formatter: '{b}'
            },
            force: {
              repulsion: repulsionForce,
              gravity: gravityForce,
              edgeLength: edgeLength,
              layoutAnimation: enableAnimation
            },
            circular: {
              rotateLabel: true
            },
            lineStyle: {
              color: 'source',
              curveness: edgeCurveness
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 3
              },
              label: {
                show: true
              }
            },
            // 可选的边捆绑设置
            edgeBundle: edgeBundling ? {
              enable: true,
              maxTurningAngle: 45,
              bundling: 0.6
            } : undefined
          }
        ]
      };

      // 设置图表选项
      chartInstance.setOption(option, true);
      
      // 如果启用自动旋转，添加旋转动画
      if (autoRotate && layoutType === 'circular') {
        let angle = 0;
        if (chartInstance._rotateSeries) {
          clearInterval(chartInstance._rotateSeries);
        }
        chartInstance._rotateSeries = setInterval(() => {
          angle = (angle + 0.2) % 360;
          chartInstance.setOption({
            series: [{
              rotateSector: angle
            }]
          });
        }, 30);
      } else if (chartInstance._rotateSeries) {
        clearInterval(chartInstance._rotateSeries);
      }
    } catch (error) {
      console.error('渲染图表时发生错误:', error);
      message.error('渲染图表时发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

  // 工具函数 - 放大图表
  const zoomIn = () => {
    if (chartInstance) {
      const currentZoom = chartInstance.getOption().series[0].zoom;
      chartInstance.setOption({
        series: [{ zoom: currentZoom * 1.2 }]
      });
    }
  };

  // 工具函数 - 缩小图表
  const zoomOut = () => {
    if (chartInstance) {
      const currentZoom = chartInstance.getOption().series[0].zoom;
      chartInstance.setOption({
        series: [{ zoom: currentZoom * 0.8 }]
      });
    }
  };

  // 工具函数 - 重置视图
  const resetView = () => {
    if (chartInstance) {
      chartInstance.dispatchAction({
        type: 'restore'
      });
    }
  };

  // 工具函数 - 导出为图像
  const exportAsImage = () => {
    if (chartInstance) {
      const url = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: renderQuality === 'high' ? 2 : 1,
        backgroundColor: '#fff'
      });
      
      const link = document.createElement('a');
      link.download = `disease-similarity-${selectedDisease?.disease_id || 'network'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('网络图已导出为图片');
    }
  };

  // 工具函数 - 创建视图快照
  const takeSnapshot = () => {
    if (!chartInstance) return;
    
    const snapshotName = `快照 ${snapshots.length + 1}`;
    const newSnapshot = {
      id: Date.now(),
      name: snapshotName,
      timestamp: new Date().toLocaleString(),
      settings: {
        similarityThreshold,
        maxNodes,
        layoutType,
        nodeSize,
        edgeWidth,
        showLabels,
        labelSize,
        repulsionForce,
        gravityForce,
        edgeLength,
        colorScheme,
        enableAnimation,
        edgeCurveness,
        edgeBundling
      },
      viewState: chartInstance.getOption()
    };
    
    setSnapshots([...snapshots, newSnapshot]);
    message.success(`视图快照 "${snapshotName}" 已创建`);
  };

  // 工具函数 - 应用快照
  const applySnapshot = (snapshotId) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot || !chartInstance) return;
    
    // 应用快照设置
    setSimilarityThreshold(snapshot.settings.similarityThreshold);
    setMaxNodes(snapshot.settings.maxNodes);
    setLayoutType(snapshot.settings.layoutType);
    setNodeSize(snapshot.settings.nodeSize);
    setEdgeWidth(snapshot.settings.edgeWidth);
    setShowLabels(snapshot.settings.showLabels);
    setLabelSize(snapshot.settings.labelSize);
    setRepulsionForce(snapshot.settings.repulsionForce);
    setGravityForce(snapshot.settings.gravityForce);
    setEdgeLength(snapshot.settings.edgeLength);
    setColorScheme(snapshot.settings.colorScheme);
    setEnableAnimation(snapshot.settings.enableAnimation);
    setEdgeCurveness(snapshot.settings.edgeCurveness);
    setEdgeBundling(snapshot.settings.edgeBundling);
    
    message.success(`已应用快照 "${snapshot.name}"`);
  };

  // 工具函数 - 删除快照
  const deleteSnapshot = (snapshotId) => {
    setSnapshots(snapshots.filter(s => s.id !== snapshotId));
    message.success('快照已删除');
  };

  // 工具函数 - 从下拉菜单选择疾病
  const handleDiseaseSelect = (value) => {
    const disease = diseaseData.find(d => d.disease_id === value);
    if (disease && onSelectDisease) {
      onSelectDisease(disease);
      setSearchTerm('');
    }
  };

  // 保存当前设置
  const saveCurrentSettings = () => {
    const currentSettings = {
      defaultSimilarityThreshold: similarityThreshold,
      maxNodeCount: maxNodes,
      defaultLayout: layoutType,
      enableAnimation: enableAnimation,
      nodeSize: nodeSize,
      edgeWidth: edgeWidth,
      showLabels: showLabels,
      labelSize: labelSize,
      repulsionForce: repulsionForce,
      gravityForce: gravityForce,
      edgeLength: edgeLength,
      colorScheme: colorScheme,
      edgeCurveness: edgeCurveness,
      edgeBundling: edgeBundling
    };
    
    // 在实际应用中，这里应该将设置保存到localStorage或通过API保存到后端
    localStorage.setItem('networkSettings', JSON.stringify(currentSettings));
    message.success('网络设置已保存');
  };

  // 重置设置为默认值
  const resetSettings = () => {
    setSimilarityThreshold(settings.defaultSimilarityThreshold);
    setMaxNodes(settings.maxNodeCount);
    setLayoutType(settings.defaultLayout);
    setNodeSize(20);
    setEdgeWidth(2);
    setShowLabels(true);
    setLabelSize(12);
    setRepulsionForce(300);
    setGravityForce(0.1);
    setEdgeLength(150);
    setColorScheme('similarity');
    setEnableAnimation(settings.enableAnimation);
    setEdgeCurveness(0.3);
    setEdgeBundling(false);
    
    message.success('网络设置已重置为默认值');
  };

  return (
    <div className="disease-network-container" ref={containerRef}>
      {/* 头部 */}
      <div className="disease-network-header">
        <div>
          <h2 className="disease-network-title">
            <NodeIndexOutlined /> 疾病相似性网络
          </h2>
          <div className="disease-network-subtitle">
            {selectedDisease ? 
              `当前疾病: ${selectedDisease.name}` : 
              '请选择疾病查看相似性网络'}
          </div>
        </div>
        <div className="search-area">
          <Input
            placeholder="搜索疾病..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 200 }}
          />
          {isFiltering && filteredDiseases.length > 0 && (
            <div className="search-results">
              {filteredDiseases.map(disease => (
                <div 
                  key={disease.disease_id} 
                  className="search-result-item"
                  onClick={() => handleDiseaseSelect(disease.disease_id)}
                >
                  <div className="search-result-name">
                    <NodeIndexOutlined /> {disease.name}
                  </div>
                  <div className="search-result-id">{disease.disease_id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="disease-network-content">
        {/* 主图表区域 */}
        <div className="disease-network-main">
          {loading || isProcessing ? (
            <div className="loading-overlay">
              <Spin size="large" tip="加载中..." />
            </div>
          ) : null}

          {!selectedDisease ? (
            <div className="empty-chart">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未选择疾病" />
              <div className="instruction">请从搜索框中选择一个疾病以查看相似性网络</div>
            </div>
          ) : (
            <div className="chart-container" ref={chartRef}></div>
          )}

          {/* 图表工具栏 */}
          <div className="toolbar">
            <Tooltip title="放大">
              <Button icon={<ZoomInOutlined />} onClick={zoomIn} />
            </Tooltip>
            <Tooltip title="缩小">
              <Button icon={<ZoomOutOutlined />} onClick={zoomOut} />
            </Tooltip>
            <Tooltip title="重置视图">
              <Button icon={<ReloadOutlined />} onClick={resetView} />
            </Tooltip>
            <Tooltip title="全屏">
              <Button 
                icon={<FullscreenOutlined />} 
                onClick={() => setIsFullscreen(!isFullscreen)}
              />
            </Tooltip>
            <Tooltip title="导出图片">
              <Button icon={<DownloadOutlined />} onClick={exportAsImage} />
            </Tooltip>
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="disease-network-sidebar">
          {/* 网络统计信息 */}
          <div className="sidebar-section">
            <div className="sidebar-title">
              <BarChartOutlined /> 网络统计
            </div>
            <div className="network-stats">
              <div className="stat-item">
                <span className="stat-label">节点数量:</span>
                <span className="stat-value">{diseasesShown}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">边数量:</span>
                <span className="stat-value">{edgesShown}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">平均相似度:</span>
                <span className="stat-value">{(avgSimilarity * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* 基本设置 */}
          <div className="sidebar-section">
            <div className="sidebar-title">
              <SettingOutlined /> 基本设置
            </div>
            <div className="sidebar-content">
              <div className="setting-item">
                <div className="setting-label">
                  <span>相似度阈值</span>
                  <span className="value">{(similarityThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={similarityThreshold}
                  onChange={setSimilarityThreshold}
                />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <span>最大节点数</span>
                  <span className="value">{maxNodes}</span>
                </div>
                <Slider
                  min={5}
                  max={100}
                  step={5}
                  value={maxNodes}
                  onChange={setMaxNodes}
                />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">布局方式</div>
                <Radio.Group 
                  value={layoutType}
                  onChange={e => setLayoutType(e.target.value)}
                  buttonStyle="solid"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Radio.Button value="force" style={{ width: '50%', textAlign: 'center' }}>
                    力导向
                  </Radio.Button>
                  <Radio.Button value="circular" style={{ width: '50%', textAlign: 'center' }}>
                    环形
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>
          </div>

          {/* 视觉设置 */}
          <div className="sidebar-section">
            <div className="sidebar-title">
              <BgColorsOutlined /> 视觉设置
            </div>
            <div className="sidebar-content">
              <div className="setting-item">
                <div className="setting-label">
                  <span>节点大小</span>
                  <span className="value">{nodeSize}</span>
                </div>
                <Slider min={10} max={40} value={nodeSize} onChange={setNodeSize} />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <span>边宽度</span>
                  <span className="value">{edgeWidth}</span>
                </div>
                <Slider min={1} max={5} step={0.5} value={edgeWidth} onChange={setEdgeWidth} />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <span>显示标签</span>
                </div>
                <Switch checked={showLabels} onChange={setShowLabels} />
              </div>
              
              <div className="setting-item">
                <div className="setting-label">
                  <span>颜色方案</span>
                </div>
                <Select
                  value={colorScheme}
                  onChange={setColorScheme}
                  style={{ width: '100%' }}
                >
                  <Option value="similarity">相似度</Option>
                  <Option value="category">分类</Option>
                </Select>
              </div>
            </div>
          </div>

          {/* 按钮操作 */}
          <div className="sidebar-section" style={{ marginTop: '20px', borderBottom: 'none' }}>
            <Space>
              <Button 
                icon={<SaveOutlined />}
                type="primary" 
                onClick={saveCurrentSettings}
              >
                保存设置
              </Button>
              <Button 
                icon={<UndoOutlined />}
                onClick={resetSettings}
              >
                重置设置
              </Button>
              <Button
                icon={<CameraOutlined />}
                onClick={takeSnapshot}
              >
                创建快照
              </Button>
            </Space>

            <div className="color-legend" style={{ marginTop: '20px' }}>
              <div className="sidebar-title" style={{ marginBottom: '10px' }}>
                <InfoCircleOutlined /> 图例
              </div>
              <div className="legend-item">
                <div className="color-box" style={{ backgroundColor: '#1a2980' }}></div>
                <span>目标疾病</span>
              </div>
              <div className="legend-item">
                <div className="color-box" style={{ backgroundColor: '#2a9355' }}></div>
                <span>高相似度 (≥80%)</span>
              </div>
              <div className="legend-item">
                <div className="color-box" style={{ backgroundColor: '#fcaa32' }}></div>
                <span>中相似度 (40-60%)</span>
              </div>
              <div className="legend-item">
                <div className="color-box" style={{ backgroundColor: '#ef5350' }}></div>
                <span>低相似度 (≤20%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedDiseaseSimilarityGraph; 