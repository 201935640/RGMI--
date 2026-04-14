import React, { useState, useEffect, useRef } from 'react';
import { Card, Space, Slider, Select, Input, Button, Radio, Switch, Tooltip, Drawer, Typography, Tag, Spin, Empty, Alert, InputNumber, Result, Row, Col } from 'antd';
import { SearchOutlined, FullscreenOutlined, FullscreenExitOutlined, ReloadOutlined, InfoCircleOutlined, DatabaseOutlined, NodeIndexOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import './DiseaseSimilarityGraph.css';
import { notification } from 'antd';
import apiService from '../utils/apiService';
import * as d3 from 'd3-force';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import EmptyStateGuide from './EmptyStateGuide';
// 引入THREE.js来处理3D渲染
import * as THREE from 'three';

const { Option } = Select;
const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

/**
 * 疾病相似性图组件 - 用于可视化疾病间的相似关系，并支持选择疾病进行详细分析
 * Disease Similarity Graph Component - Visualizes similarity between diseases and supports selection for detailed analysis
 */
const DiseaseSimilarityGraph = ({ diseaseList, onDiseaseSelect, language = 'zh' }) => {
  // 状态变量
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [nodeSize, setNodeSize] = useState(1);
  const [nodeCount, setNodeCount] = useState(50);
  const [layoutType, setLayoutType] = useState('force');
  const [showLabels, setShowLabels] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [diseaseDetails, setDiseaseDetails] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiChecked, setApiChecked] = useState(false);
  
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 初始化图表数据，仅在用户交互后
  useEffect(() => {
    if (hasUserInteracted && diseaseList && diseaseList.length > 0) {
      setLoading(true);
      setTimeout(() => {
        processGraphData();
        setLoading(false);
      }, 300);
    }
  }, [diseaseList, similarityThreshold, nodeCount, hasUserInteracted]);

  // 加载网络数据，仅在用户交互后
  useEffect(() => {
    if (!hasUserInteracted || !similarityThreshold) return;
    
    setLoading(true);
    setNetworkData(null);
    setErrorMessage(null);
    
    const fetchNetworkData = async () => {
      try {
        // 不调用fetchDiseaseNetwork，改为直接使用已有的疾病列表数据
        // const data = await apiService.fetchDiseaseNetwork(similarityThreshold);
        
        // 使用现有疾病列表数据创建网络数据
        if (diseaseList && diseaseList.length > 0) {
          const nodes = [];
          const links = [];
          const MAX_DISEASES = Math.min(nodeCount, diseaseList.length);
          
          // 创建节点
          for (let i = 0; i < MAX_DISEASES; i++) {
            const disease = diseaseList[i];
            nodes.push({
              id: disease.disease_id,
              name: disease.name || disease.disease_id,
              symbolSize: 20 * nodeSize,
              value: 1,
              category: 0
            });
          }
          
          // 创建随机连接（模拟相似关系）
          for (let i = 0; i < MAX_DISEASES; i++) {
            for (let j = i + 1; j < MAX_DISEASES; j++) {
              // 设置随机相似度（模拟）
              const similarity = Math.random();
              if (similarity >= similarityThreshold) {
                links.push({
                  source: diseaseList[i].disease_id,
                  target: diseaseList[j].disease_id,
                  value: similarity
                });
              }
            }
          }
          
          setNetworkData({ nodes, links });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('创建网络数据失败:', error);
        setErrorMessage(t('无法创建网络数据，请检查疾病列表是否有效', 
                          'Failed to create network data. Please check if the disease list is valid'));
        setLoading(false);
        
        // 显示错误通知
        notification.error({
          message: t('网络数据错误', 'Network Data Error'),
          description: error.message || t('无法创建网络数据，请稍后重试', 'Failed to create network data. Please try again later'),
          duration: 5
        });
      }
    };
    
    fetchNetworkData();
  }, [similarityThreshold, t, hasUserInteracted, diseaseList, nodeCount, nodeSize]);

  // 检查API连接状态
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const status = await apiService.checkApiStatus();
        setApiConnected(status.connected);
        setApiChecked(true);
      } catch (error) {
        console.error('检查API状态时出错:', error);
        setApiConnected(false);
        setApiChecked(true);
      }
    };
    
    checkApiStatus();
  }, []);

  // 启动加载网络
  const handleStartExploration = () => {
    setHasUserInteracted(true);
  };

  // 处理图表数据
  const processGraphData = () => {
    if (!diseaseList || diseaseList.length === 0) {
      setGraphData({ nodes: [], links: [] });
      return;
    }
    
    // 筛选出基准疾病
    const baselineDisease = diseaseList.find(d => d.isBaseline);
    if (!baselineDisease) {
      // 如果没有基准疾病，使用所有疾病创建图
      processAllDiseases();
      return;
    }
    
    // 如果有基准疾病，创建以该疾病为中心的图
    const nodes = [];
    const links = [];

    // 添加基准疾病节点
    nodes.push({
      id: baselineDisease.disease_id,
      name: baselineDisease.name,
      symbolSize: 30 * nodeSize,
      value: 1,
      category: 0,
      itemStyle: {
        color: '#c23531'
      },
      label: {
        show: true
      }
    });

    // 根据相似度过滤相关疾病，并限制数量
    const relatedDiseases = diseaseList
      .filter(d => d.disease_id !== baselineDisease.disease_id)
      .filter(d => {
        if (filterType !== 'all' && d.type) {
          return d.type.toLowerCase().includes(filterType.toLowerCase());
        }
        return true;
      })
      .filter(d => {
        if (searchText) {
          return d.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (d.disease_id && d.disease_id.toLowerCase().includes(searchText.toLowerCase()));
        }
        return true;
      })
      .filter(d => {
        // 计算与基准疾病的相似度，这里使用模拟数据
        d.similarity = d.similarity || Math.random().toFixed(2);
        return d.similarity >= similarityThreshold;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, nodeCount);

    // 添加相关疾病节点和连接
    relatedDiseases.forEach(disease => {
      nodes.push({
        id: disease.disease_id,
        name: disease.name,
        symbolSize: (15 + disease.similarity * 15) * nodeSize,
        value: disease.similarity,
        category: 1,
        itemStyle: {
          color: getNodeColor(disease.similarity)
        },
        label: {
          show: showLabels
        }
      });

      links.push({
        source: baselineDisease.disease_id,
        target: disease.disease_id,
        value: disease.similarity,
        lineStyle: {
          width: disease.similarity * 3,
          color: 'source'
        }
      });
    });

    setGraphData({ nodes, links });
  };

  // 处理所有疾病的图表数据
  const processAllDiseases = () => {
    // 过滤疾病列表
    let filteredDiseases = [...diseaseList];
    
    if (filterType !== 'all') {
      filteredDiseases = filteredDiseases.filter(d => 
        d.type && d.type.toLowerCase().includes(filterType.toLowerCase())
      );
    }
    
    if (searchText) {
      filteredDiseases = filteredDiseases.filter(d =>
        d.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (d.disease_id && d.disease_id.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    // 限制数量
    filteredDiseases = filteredDiseases.slice(0, nodeCount);
    
    const nodes = [];
    const links = [];
    
    // 添加所有疾病节点
    filteredDiseases.forEach(disease => {
      nodes.push({
        id: disease.disease_id,
        name: disease.name,
        symbolSize: 20 * nodeSize,
        category: 0,
        label: {
          show: showLabels
        }
      });
    });
    
    // 如果疾病太多，只创建部分连接以避免过度拥挤
    const maxLinks = Math.min(100, nodes.length * 3);
    let linkCount = 0;
    
    for (let i = 0; i < nodes.length && linkCount < maxLinks; i++) {
      for (let j = i + 1; j < nodes.length && linkCount < maxLinks; j++) {
        // 生成随机相似度（在实际应用中，这应该从API获取）
        const similarity = Math.random();
        
        if (similarity >= similarityThreshold) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: similarity,
            lineStyle: {
              width: similarity * 2,
              color: getNodeColor(similarity)
            }
          });
          linkCount++;
        }
      }
    }
    
    setGraphData({ nodes, links });
  };
  
  // 处理节点点击事件
  const handleNodeClick = (params) => {
    if (params.dataType === 'node') {
      try {
        // 查找选中的疾病
        const selectedNode = params.data;
        const selectedDiseaseData = diseaseList.find(d => d.disease_id === selectedNode.id);
        
        if (selectedDiseaseData) {
          setSelectedDisease(selectedDiseaseData);
          
          // 显示详情抽屉
          setShowDetails(true);
          
          // 执行外部回调
          if (typeof onDiseaseSelect === 'function') {
            onDiseaseSelect(selectedDiseaseData);
          }
          
          // 尝试获取更多疾病详情
          const fetchDiseaseDetail = async () => {
            try {
              setDiseaseDetails({ loading: true });
              const detail = await apiService.fetchDiseaseDetail(selectedDiseaseData.disease_id);
              setDiseaseDetails({ 
                data: detail, 
                loading: false,
                error: null
              });
            } catch (error) {
              console.error('获取疾病详情失败:', error);
              setDiseaseDetails({ 
                data: null, 
                loading: false, 
                error: error.message || '获取疾病详情失败' 
              });
            }
          };
          
          fetchDiseaseDetail();
        }
      } catch (error) {
        console.error('处理节点点击事件失败:', error);
      }
    }
  };
  
  // 获取节点颜色
  const getNodeColor = (value) => {
    if (value > 0.8) return '#27ae60';
    if (value > 0.6) return '#2980b9';
    if (value > 0.4) return '#8e44ad';
    if (value > 0.2) return '#f39c12';
    return '#95a5a6';
  };
  
  // 获取标签颜色
  const getTagColor = (value) => {
    if (value > 0.8) return 'green';
    if (value > 0.6) return 'blue';
    if (value > 0.4) return 'purple';
    if (value > 0.2) return 'orange';
    return 'default';
  };
  
  // 切换全屏状态
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // 重新布局图表
  const refreshLayout = () => {
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      chart.setOption(getChartOption());
    }
  };

  // 获取图表配置
  const getChartOption = () => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      return {
        title: {
          text: t('暂无数据', 'No Data Available'),
          left: 'center',
          top: 'center'
        }
      };
    }
    
    return {
      title: {
        text: t('疾病相似性网络', 'Disease Similarity Network'),
        subtext: t(`节点: ${graphData.nodes.length} | 连接: ${graphData.links.length} | 相似度阈值: ${similarityThreshold}`, 
                 `Nodes: ${graphData.nodes.length} | Links: ${graphData.links.length} | Similarity Threshold: ${similarityThreshold}`),
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'edge') {
            const value = typeof params.data.value === 'string' ? parseFloat(params.data.value) : params.data.value;
            return `${params.data.source} → ${params.data.target}<br/>
                    ${t('相似度', 'Similarity')}: ${Number.isFinite(value) ? (value * 100).toFixed(1) : 0}%<br/>
                    <span style="color:#999">${t('点击节点查看详情', 'Click node for details')}</span>`;
          }
          
          return `<b>${params.name}</b><br/>
                  ${params.data.category === 0 ? t('基准疾病', 'Baseline Disease') : t('相关疾病', 'Related Disease')}<br/>
                  ${t('相似度', 'Similarity')}: ${typeof params.data.value === 'number' ? (params.data.value * 100).toFixed(1) : 0}%<br/>
                  <span style="color:#999">${t('点击查看详情', 'Click for details')}</span>`;
        }
      },
      legend: {
        data: [t('基准疾病', 'Baseline'), t('相关疾病', 'Related')],
        orient: 'horizontal',
        top: 50,
        right: 10
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: t('疾病网络', 'Disease Network'),
          type: 'graph',
          layout: layoutType,
          data: graphData.nodes,
          links: graphData.links,
          categories: [
            { name: t('基准疾病', 'Baseline') },
            { name: t('相关疾病', 'Related') }
          ],
          roam: true,
          focusNodeAdjacency: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          label: {
            position: 'right'
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
  };
  
  // 获取MedGen链接
  const getMedGenLink = (diseaseId) => {
    // 如果疾病ID是数字格式，加上前缀C
    if (diseaseId && /^\d+$/.test(diseaseId)) {
      return `https://www.ncbi.nlm.nih.gov/medgen/C${diseaseId}`;
    }
    // 如果已经是C开头的格式，直接使用
    else if (diseaseId && diseaseId.startsWith('C')) {
      return `https://www.ncbi.nlm.nih.gov/medgen/${diseaseId}`;
    }
    // 其他情况，使用疾病名称作为搜索词
    else {
      return `https://www.ncbi.nlm.nih.gov/medgen/?term=${encodeURIComponent(diseaseDetails?.name || '')}`;
    }
  };
  
  // 渲染疾病详情抽屉
  const renderDiseaseDetails = () => {
    if (!diseaseDetails) return null;
    
    // 获取MedGen链接
    const medGenLink = getMedGenLink(diseaseDetails.disease_id);
    
    return (
      <Drawer
        title={
          <div className="detail-drawer-title">
            <Text strong>{diseaseDetails.name}</Text>
            <Tag color={diseaseDetails.isBaseline ? 'red' : 'blue'}>
              {diseaseDetails.isBaseline ? t('基准疾病', 'Baseline') : t('相关疾病', 'Related')}
            </Tag>
          </div>
        }
        placement="right"
        onClose={() => setShowDetails(false)}
        open={showDetails}
        width={400}
        className="disease-detail-drawer"
      >
        <div className="disease-detail-content">
          <div className="detail-section">
            <Title level={5}>{t('基本信息', 'Basic Info')}</Title>
            <Paragraph>
              <Text strong>ID: </Text> {diseaseDetails.disease_id || t('未知', 'Unknown')}
            </Paragraph>
            {diseaseDetails.type && (
              <Paragraph>
                <Text strong>{t('类型', 'Type')}: </Text> {diseaseDetails.type}
              </Paragraph>
            )}
            {!diseaseDetails.isBaseline && (
              <Paragraph>
                <Text strong>{t('相似度', 'Similarity')}: </Text> 
                <Tag color={getTagColor(diseaseDetails.similarity)}>
                  {((diseaseDetails.similarity || 0) * 100).toFixed(1)}%
                </Tag>
              </Paragraph>
            )}
          </div>
          
          {diseaseDetails.description && (
            <div className="detail-section">
              <Title level={5}>{t('描述', 'Description')}</Title>
              <Paragraph>{diseaseDetails.description}</Paragraph>
            </div>
          )}
          
          <div className="detail-section">
            <Title level={5}>{t('相关数据', 'Related Data')}</Title>
            <Paragraph>
              <Text strong>{t('相关基因', 'Related Genes')}: </Text> 
              {diseaseDetails.geneCount || 0}
            </Paragraph>
            <Paragraph>
              <Text strong>{t('相关miRNA', 'Related miRNAs')}: </Text> 
              {diseaseDetails.mirnaCount || 0}
            </Paragraph>
          </div>
          
          <div className="detail-section">
            <Title level={5}>{t('外部链接', 'External Links')}</Title>
            <Paragraph>
              <a href={medGenLink} target="_blank" rel="noopener noreferrer">
                {t('在MedGen中查看', 'View in MedGen')}
              </a>
            </Paragraph>
          </div>
          
          <div className="detail-actions">
            <Button 
              type="primary" 
              onClick={() => onDiseaseSelect(diseaseDetails)}
            >
              {t('查看详细分析', 'View Detailed Analysis')}
            </Button>
          </div>
        </div>
      </Drawer>
    );
  };

  // 渲染欢迎指南
  const renderWelcomeGuide = () => {
    return (
      <Result
        icon={<NodeIndexOutlined style={{ color: '#1890ff' }} />}
        title={t('疾病相似性网络分析', 'Disease Similarity Network Analysis')}
        subTitle={t('探索疾病间的相似关系，发现潜在的关联与规律', 'Explore similarity relationships between diseases and discover potential associations')}
        extra={
          <Button type="primary" size="large" icon={<DatabaseOutlined />} onClick={handleStartExploration}>
            {t('开始探索网络', 'Start Network Exploration')}
          </Button>
        }
        className="welcome-guide"
      >
        <div className="guide-description">
          <Paragraph>
            {t('通过疾病相似性网络，您可以：', 'With the disease similarity network, you can:')}
          </Paragraph>
          <ul>
            <li>{t('直观地查看疾病之间的相似关系', 'Visually see similarity relationships between diseases')}</li>
            <li>{t('根据相似度阈值筛选相关疾病', 'Filter related diseases based on similarity threshold')}</li>
            <li>{t('发现潜在的疾病关联模式', 'Discover potential disease association patterns')}</li>
            <li>{t('查看详细的疾病信息及关联数据', 'View detailed disease information and related data')}</li>
          </ul>
        </div>
      </Result>
    );
  };

  // 如果API状态未检查完成，显示加载状态
  if (!apiChecked) {
    return (
      <div className="loading-container">
        <Spin tip={t('正在检查API状态...', 'Checking API status...')} />
      </div>
    );
  }

  // 如果API未连接且尚未点击开始探索，显示错误提示
  if (!apiConnected && !graphData && !loading) {
    return (
      <EmptyStateGuide 
        type="api-error"
        message={t('无法连接到API服务，但您仍可以探索示例数据', 'Could not connect to the API service, but you can still explore sample data')}
        onRetry={handleStartExploration}
      />
    );
  }

  // 如果出现错误，显示错误信息
  if (errorMessage) {
    return (
      <Alert
        type="error"
        message={t('加载出错', 'Loading Error')}
        description={errorMessage}
        action={
          <Button type="primary" onClick={() => setSimilarityThreshold(prevValue => prevValue)}>
            {t('重试', 'Retry')}
          </Button>
        }
      />
    );
  }

  // 如果正在加载，显示加载动画
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip={t('正在加载网络数据...', 'Loading network data...')} />
      </div>
    );
  }

  // 如果尚未获取图谱数据，显示欢迎引导
  if (!graphData) {
    return renderWelcomeGuide();
  }

  // 渲染图谱
  return (
    <div className="disease-graph-container" ref={containerRef}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title={
              <div className="graph-header">
                <span>{t('疾病相似性网络', 'Disease Similarity Network')}</span>
                <div className="graph-controls">
                  <Tooltip title={t('刷新布局', 'Refresh Layout')}>
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={refreshLayout}
                      size="small"
                    />
                  </Tooltip>
                  <Tooltip title={is3D ? t('切换到2D视图', 'Switch to 2D View') : t('切换到3D视图', 'Switch to 3D View')}>
                    <Button 
                      onClick={() => setIs3D(!is3D)}
                      size="small"
                    >
                      {is3D ? '2D' : '3D'}
                    </Button>
                  </Tooltip>
                </div>
              </div>
            }
            className="graph-card"
          >
            <div className="graph-container">
              {is3D ? (
                <ForceGraph3D
                  ref={graphRef}
                  graphData={graphData}
                  nodeLabel={node => `${node.name} (${node.id})`}
                  nodeColor={node => node.color}
                  nodeRelSize={6}
                  linkWidth={link => Math.sqrt(link.value) * 3}
                  linkDirectionalParticles={4}
                  linkDirectionalParticleSpeed={d => d.value * 0.01}
                  onNodeClick={handleNodeClick}
                  nodeThreeObject={node => {
                    const sphere = new THREE.Mesh(
                      new THREE.SphereGeometry(Math.sqrt(node.value) * 1.5, 16, 16),
                      new THREE.MeshLambertMaterial({
                        color: node.color,
                        transparent: true,
                        opacity: 0.8
                      })
                    );
                    return sphere;
                  }}
                  cooldownTime={2000}
                  enableNodeDrag={true}
                  enableNavigationControls={true}
                />
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  nodeLabel={node => `${node.name} (${node.id})`}
                  nodeColor={node => node.color}
                  nodeRelSize={6}
                  nodeVal={node => node.value}
                  linkWidth={link => Math.sqrt(link.value) * 2}
                  linkColor={link => {
                    const opacity = Math.max(0.1, link.value);
                    return `rgba(0, 123, 255, ${opacity})`;
                  }}
                  onNodeClick={handleNodeClick}
                  cooldownTime={2000}
                  enableZoomInteraction={true}
                  enablePanInteraction={true}
                  enableNodeDrag={true}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={d => d.value * 0.01}
                />
              )}
            </div>
            
            {!apiConnected && (
              <Alert
                type="warning"
                message={t('使用示例数据', 'Using Sample Data')}
                description={t('当前显示的是示例数据。API服务不可用，某些功能可能受限。', 'Currently displaying sample data. API service is unavailable, some features may be limited.')}
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            
            <div className="graph-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#27ae60' }}></span>
                <span>{t('高相似度 (>0.8)', 'High Similarity (>0.8)')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2980b9' }}></span>
                <span>{t('中高相似度 (0.6-0.8)', 'Medium-High Similarity (0.6-0.8)')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#8e44ad' }}></span>
                <span>{t('中等相似度 (0.4-0.6)', 'Medium Similarity (0.4-0.6)')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f39c12' }}></span>
                <span>{t('低相似度 (0.2-0.4)', 'Low Similarity (0.2-0.4)')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#95a5a6' }}></span>
                <span>{t('极低相似度 (<0.2)', 'Very Low Similarity (<0.2)')}</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {renderDiseaseDetails()}
    </div>
  );
};

export default DiseaseSimilarityGraph; 