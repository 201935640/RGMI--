import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, Empty, Space, Slider, Switch, Radio, Row, Col, Button, Tooltip, Tag, Divider } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, FullscreenOutlined, ReloadOutlined, InfoCircleOutlined, ExperimentOutlined, NodeIndexOutlined } from '@ant-design/icons';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, ToolboxComponent, TooltipComponent, TitleComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import './DiseaseSimilarityNetwork.css';
import newApiService from '../utils/newApiService';

// 注册必要的ECharts组件
echarts.use([
  GraphChart,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  TitleComponent,
  GridComponent,
  CanvasRenderer
]);

/**
 * 疾病相似性网络组件
 * 该组件展示疾病与其相似疾病之间的关系，以及它们共享的基因和miRNA
 * 
 * @param {Object} props 
 * @param {Object} props.targetDisease 目标疾病
 * @param {Array} props.similarDiseases 相似疾病列表
 * @param {Function} props.onNodeClick 节点点击回调
 * @param {Boolean} props.loading 加载状态
 */
const DiseaseSimilarityNetwork = ({ 
  targetDisease, 
  similarDiseases = [], 
  onNodeClick,
  loading = false
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // 状态变量
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [showGenes, setShowGenes] = useState(true);
  const [showMiRNAs, setShowMiRNAs] = useState(true);
  const [layoutType, setLayoutType] = useState('force');
  const [error, setError] = useState(null);
  const [showPredicted, setShowPredicted] = useState(true);
  const [geneInteractions, setGeneInteractions] = useState(null);
  // 新增状态变量，保存基因和miRNA映射，使其在整个组件中可用
  const [geneMap, setGeneMap] = useState(new Map());
  const [miRNAMap, setMiRNAMap] = useState(new Map());
  
  // 颜色配置
  const colors = {
    targetDisease: '#10B981',       // 目标疾病颜色 - 翠绿
    similarDisease: '#0D5E3F',      // 相似疾病颜色 - 深绿
    gene: '#D4AF37',                // 基因颜色 - 琥珀金
    miRNA: '#6EE7B7',               // miRNA颜色 - 亮绿
    linkDisease: 'rgba(16, 185, 129, 0.2)', // 疾病间连接颜色
    linkGene: 'rgba(212, 175, 55, 0.3)',    // 疾病-基因连接颜色
    linkMiRNA: 'rgba(110, 231, 183, 0.3)'   // 疾病-miRNA连接颜色
  };
  
  // 生成网络数据
  useEffect(() => {
    if (!targetDisease) return;
    
    try {
      // 准备数据容器
      const nodes = [];
      const links = [];
      const newGeneMap = new Map();
      const newMiRNAMap = new Map();
      
      // 添加目标疾病节点
      nodes.push({
        id: targetDisease.disease_id,
        name: targetDisease.name || targetDisease.disease_id,
        symbolSize: 45,
        itemStyle: { color: colors.targetDisease },
        category: 0,
        value: 1,
        label: { show: true }
      });
      
      // 过滤相似度大于阈值的疾病
      const filteredDiseases = similarDiseases.filter(d => d.similarity >= similarityThreshold);
      
      // 添加相似疾病节点
      filteredDiseases.forEach(disease => {
        nodes.push({
          id: disease.disease_id,
          name: disease.name || disease.disease_id,
          symbolSize: Math.max(20, disease.similarity * 40),
          itemStyle: { color: colors.similarDisease },
          category: 0,
          value: disease.similarity,
          label: { show: true }
        });
        
        // 添加疾病间连接
        links.push({
          source: targetDisease.disease_id,
          target: disease.disease_id,
          value: disease.similarity,
          lineStyle: {
            width: disease.similarity * 5,
            color: colors.linkDisease
          }
        });
      });
      
      // 处理基因
      if (showGenes && targetDisease.attributes?.associated_gene_names) {
        // 收集所有疾病的基因
        const processGenes = (disease, isTarget = false) => {
          const genes = disease.attributes?.associated_gene_names || [];
          genes.forEach(gene => {
            if (!newGeneMap.has(gene)) {
              newGeneMap.set(gene, { 
                count: 1, 
                diseases: [disease.disease_id] 
              });
              
              // 添加基因节点
              nodes.push({
                id: `gene_${gene}`,
                name: gene,
                symbolSize: 15,
                symbol: 'rect',
                itemStyle: { color: colors.gene },
                category: 1,
                geneUrl: `https://www.ncbi.nlm.nih.gov/gene/${gene}`,
                label: { show: false }
              });
            } else {
              const geneInfo = newGeneMap.get(gene);
              geneInfo.count++;
              geneInfo.diseases.push(disease.disease_id);
              newGeneMap.set(gene, geneInfo);
            }
            
            // 添加疾病-基因连接
            links.push({
              source: disease.disease_id,
              target: `gene_${gene}`,
              value: 0.5,
              lineStyle: {
                width: 2,
                color: colors.linkGene
              }
            });
          });
        };
        
        // 处理目标疾病的基因
        processGenes(targetDisease, true);
        
        // 处理相似疾病的基因
        filteredDiseases.forEach(disease => {
          processGenes(disease);
        });
      }
      
      // 处理miRNA
      if (showMiRNAs && targetDisease.attributes?.associated_miRNA_names) {
        // 收集所有疾病的miRNA
        const processMiRNAs = (disease, isTarget = false) => {
          const miRNAs = disease.attributes?.associated_miRNA_names || [];
          miRNAs.forEach(mirna => {
            if (!newMiRNAMap.has(mirna)) {
              newMiRNAMap.set(mirna, { 
                count: 1, 
                diseases: [disease.disease_id] 
              });
              
              // 添加miRNA节点
              nodes.push({
                id: `mirna_${mirna}`,
                name: mirna,
                symbolSize: 15,
                symbol: 'triangle',
                itemStyle: { color: colors.miRNA },
                category: 2,
                mirnaUrl: mirna.startsWith('hsa-') || mirna.startsWith('mmu-') || mirna.startsWith('rno-') 
                  ? `https://mirbase.org/results/?query=${encodeURIComponent(mirna)}`
                  : `http://mirdb.org/cgi-bin/search.cgi?searchType=miRNA&searchBox=${encodeURIComponent(mirna)}`,
                label: { show: false }
              });
            } else {
              const mirnaInfo = newMiRNAMap.get(mirna);
              mirnaInfo.count++;
              mirnaInfo.diseases.push(disease.disease_id);
              newMiRNAMap.set(mirna, mirnaInfo);
            }
            
            // 添加疾病-miRNA连接
            links.push({
              source: disease.disease_id,
              target: `mirna_${mirna}`,
              value: 0.5,
              lineStyle: {
                width: 2,
                color: colors.linkMiRNA
              }
            });
          });
        };
        
        // 处理目标疾病的miRNA
        processMiRNAs(targetDisease, true);
        
        // 处理相似疾病的miRNA
        filteredDiseases.forEach(disease => {
          processMiRNAs(disease);
        });
      }
      
      // 为共享的基因和miRNA添加额外连接
      // 共享基因
      newGeneMap.forEach((info, gene) => {
        // 如果一个基因被多个疾病共享，添加它们之间的连接
        if (info.count > 1) {
          const diseases = info.diseases;
          for (let i = 0; i < diseases.length; i++) {
            for (let j = i + 1; j < diseases.length; j++) {
              // 检查这个连接是否已存在
              const existingLink = links.find(link => 
                (link.source === diseases[i] && link.target === diseases[j]) || 
                (link.source === diseases[j] && link.target === diseases[i])
              );
              
              if (!existingLink) {
                links.push({
                  source: diseases[i],
                  target: diseases[j],
                  value: 0.3,
                  lineStyle: {
                    width: 1,
                    color: colors.linkGene,
                    type: 'dashed'
                  }
                });
              }
            }
          }
        }
      });
      
      // 共享miRNA
      newMiRNAMap.forEach((info, mirna) => {
        // 如果一个miRNA被多个疾病共享，添加它们之间的连接
        if (info.count > 1) {
          const diseases = info.diseases;
          for (let i = 0; i < diseases.length; i++) {
            for (let j = i + 1; j < diseases.length; j++) {
              // 检查这个连接是否已存在
              const existingLink = links.find(link => 
                (link.source === diseases[i] && link.target === diseases[j]) || 
                (link.source === diseases[j] && link.target === diseases[i])
              );
              
              if (!existingLink) {
                links.push({
                  source: diseases[i],
                  target: diseases[j],
                  value: 0.3,
                  lineStyle: {
                    width: 1,
                    color: colors.linkMiRNA,
                    type: 'dashed'
                  }
                });
              }
            }
          }
        }
      });
      
      setNetworkData({ nodes, links });
      // 更新基因和miRNA映射至状态
      setGeneMap(newGeneMap);
      setMiRNAMap(newMiRNAMap);
    } catch (err) {
      console.error('生成网络数据时出错:', err);
      setError('生成网络数据时出错: ' + err.message);
    }
  }, [targetDisease, similarDiseases, similarityThreshold, showGenes, showMiRNAs]);

  // 获取基因交互数据（AI预测）
  useEffect(() => {
    if (!targetDisease || !targetDisease.disease_id) return;

    const fetchGeneInteractions = async () => {
      try {
        const data = await newApiService.getGeneInteractions(targetDisease.disease_id);
        setGeneInteractions(data);
      } catch (error) {
        console.error('获取基因交互数据失败:', error);
        // 不阻断主流程
      }
    };

    fetchGeneInteractions();
  }, [targetDisease]);

  // 初始化和更新图表
  useEffect(() => {
    if (!chartRef.current) return;
    
    // 如果已存在图表实例，销毁它
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    
    // 创建新的图表实例
    chartInstance.current = echarts.init(chartRef.current);
    
    // 监听窗口大小变化，调整图表大小
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);
  
  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || !networkData.nodes.length) return;
    
    const option = {
      title: {
        text: '疾病相似性关联网络',
        subtext: '多维度展示疾病表型与分子标记的拓扑关系',
        left: '20',
        top: '20',
        textStyle: {
          color: '#0D5E3F',
          fontSize: 20,
          fontWeight: 'bold'
        },
        subtextStyle: {
          color: '#64748b',
          fontSize: 13
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1,
        textStyle: { color: '#1e293b' },
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'node') {
            const data = params.data;
            let content = `<div style="font-weight:bold; margin-bottom:5px;">${data.name}</div>`;
            
            if (data.category === 0) {
              // 疾病节点
              content += `<div>类型: 疾病</div>`;
              if (data.value !== 1) {
                content += `<div>相似度: ${(data.value * 100).toFixed(1)}%</div>`;
              }
            } else if (data.category === 1) {
              // 基因节点
              content += `<div>类型: 基因</div>`;
              const geneInfo = geneMap.get(data.name);
              if (geneInfo) {
                content += `<div>关联疾病: ${geneInfo.count}个</div>`;
              }
            } else if (data.category === 2) {
              // miRNA节点
              content += `<div>类型: miRNA</div>`;
              const mirnaInfo = miRNAMap.get(data.name);
              if (mirnaInfo) {
                content += `<div>关联疾病: ${mirnaInfo.count}个</div>`;
              }
            }
            
            return content;
          }
          return params.name;
        }
      },
      legend: {
        data: ['疾病', '基因', 'miRNA'],
        icon: 'circle',
        bottom: 10,
        left: 'center',
        textStyle: {
          color: '#333'
        }
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: '疾病相似性网络',
          type: 'graph',
          layout: layoutType,
          data: networkData.nodes,
          links: networkData.links,
          categories: [
            { name: '疾病' },
            { name: '基因' },
            { name: 'miRNA' }
          ],
          roam: true,
          draggable: true,
          label: {
            position: 'right',
            formatter: '{b}'
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          },
          force: {
            repulsion: 200,
            edgeLength: 120
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          }
        }
      ]
    };
    
    // 应用图表配置
    chartInstance.current.setOption(option);
    
    // 添加点击事件
    chartInstance.current.on('click', function(params) {
      if (params.dataType === 'node') {
        const data = params.data;
        if (data.category === 0 && typeof onNodeClick === 'function') {
          // 处理疾病节点的点击
          const diseaseId = data.id;
          if (diseaseId !== targetDisease.disease_id) {
            // 从网络设置中获取当前设置的topN值（如果有）
            const topN = targetDisease.related_diseases ? targetDisease.related_diseases.length : 50;
            // 直接传递疾病ID和topN值
            onNodeClick(diseaseId, topN);
          }
        } else if (data.category === 1 && data.geneUrl) {
          // 处理基因节点的点击 - 打开NCBI基因数据库
          window.open(data.geneUrl, '_blank');
        } else if (data.category === 2 && data.mirnaUrl) {
          // 处理miRNA节点的点击 - 打开miRBase或miRDB
          window.open(data.mirnaUrl, '_blank');
        }
      }
    });
  }, [networkData, layoutType, onNodeClick, geneMap, miRNAMap]);
  
  // 调整图表大小
  const resizeChart = () => {
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  };
  
  // 缩放控制
  const zoomIn = () => {
    chartInstance.current?.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 50
    });
  };
  
  const zoomOut = () => {
    chartInstance.current?.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    });
  };
  
  // 重置视图
  const resetView = () => {
    chartInstance.current?.dispatchAction({
      type: 'restore'
    });
  };
  
  // 渲染组件
  if (loading) {
    return (
      <Card className="disease-network-card">
        <div className="loading-container">
          <Spin size="large" tip="正在生成疾病相似性网络..." />
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="disease-network-card">
        <div className="error-container">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'red' }}>{error}</span>}
          />
        </div>
      </Card>
    );
  }
  
  if (!targetDisease) {
    return (
      <Card className="disease-network-card">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请先选择一个疾病"
        />
      </Card>
    );
  }
  
  return (
    <Card 
      className="disease-network-card"
      title="疾病相似性网络"
      extra={
        <Space>
          <Tooltip title="放大">
            <Button icon={<ZoomInOutlined />} onClick={zoomIn} size="small" />
          </Tooltip>
          <Tooltip title="缩小">
            <Button icon={<ZoomOutOutlined />} onClick={zoomOut} size="small" />
          </Tooltip>
          <Tooltip title="重置视图">
            <Button icon={<ReloadOutlined />} onClick={resetView} size="small" />
          </Tooltip>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24} md={6}>
          <div className="network-controls">
            <div className="control-section">
              <div className="control-title">网络设置</div>
              <div className="control-item">
                <div className="item-label">
                  <span>相似度阈值: </span>
                  <span className="item-value">{(similarityThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={similarityThreshold}
                  onChange={setSimilarityThreshold}
                  marks={{
                    0: '0%',
                    0.25: '25%',
                    0.5: '50%',
                    0.75: '75%',
                    1: '100%'
                  }}
                  tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
                  className="similarity-threshold-slider"
                />
              </div>
              
              <div className="control-item">
                <span className="item-label">显示基因</span>
                <Switch checked={showGenes} onChange={setShowGenes} />
              </div>

              <div className="control-item">
                <span className="item-label">显示miRNA</span>
                <Switch checked={showMiRNAs} onChange={setShowMiRNAs} />
              </div>

              <div className="control-item">
                <span className="item-label">
                  显示AI预测
                  <Tooltip title="显示基于GDFM模型预测的基因交互关系（虚线）">
                    <ExperimentOutlined style={{ marginLeft: 4, color: '#FFA500' }} />
                  </Tooltip>
                </span>
                <Switch checked={showPredicted} onChange={setShowPredicted} />
              </div>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="legend-section">
              <div className="control-title">图例</div>
              <div className="legend-item">
                <div className="legend-icon" style={{ backgroundColor: colors.targetDisease }}></div>
                <span>目标疾病</span>
              </div>
              <div className="legend-item">
                <div className="legend-icon" style={{ backgroundColor: colors.similarDisease }}></div>
                <span>相似疾病</span>
              </div>
              <div className="legend-item">
                <div className="legend-icon" style={{ backgroundColor: colors.gene, borderRadius: '2px' }}></div>
                <span>基因</span>
              </div>
              <div className="legend-item">
                <div className="legend-icon" style={{ backgroundColor: colors.miRNA, clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}></div>
                <span>miRNA</span>
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              <div className="control-subtitle">连接类型</div>
              
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: colors.linkDisease }}></div>
                <span>疾病间直接相似性 (实线)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: colors.linkGene }}></div>
                <span>疾病-基因关联 (实线)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line" style={{ backgroundColor: colors.linkMiRNA }}></div>
                <span>疾病-miRNA关联 (实线)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line legend-dashed" style={{ backgroundColor: colors.linkGene }}></div>
                <span>相关节点间关系 (虚线-基因)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line legend-dashed" style={{ backgroundColor: colors.linkMiRNA }}></div>
                <span>相关节点间关系 (虚线-miRNA)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line legend-dashed" style={{ backgroundColor: '#FFA500' }}></div>
                <span>
                  AI预测关系 (虚线)
                  <Tag color="orange" style={{ marginLeft: 4, fontSize: '10px' }}>GDFM</Tag>
                </span>
              </div>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="network-stats">
              <div className="control-title">网络统计</div>
              <div className="stats-item">
                <span>疾病数量:</span>
                <strong>{networkData.nodes.filter(n => n.category === 0).length}</strong>
              </div>
              <div className="stats-item">
                <span>基因数量:</span>
                <strong>{networkData.nodes.filter(n => n.category === 1).length}</strong>
              </div>
              <div className="stats-item">
                <span>miRNA数量:</span>
                <strong>{networkData.nodes.filter(n => n.category === 2).length}</strong>
              </div>
              <div className="stats-item">
                <span>连接数量:</span>
                <strong>{networkData.links.length}</strong>
              </div>
            </div>
          </div>
        </Col>
        
        <Col span={24} md={18}>
          <div className="network-container">
            <div className="network-graph" ref={chartRef} style={{ height: '600px', width: '100%' }}></div>
            <div className="network-info">
              <InfoCircleOutlined /> 提示: 可以拖动、缩放和点击节点进行交互。点击疾病节点可查看详情，点击基因或miRNA节点可查看外部数据库信息。
            </div>
          </div>
        </Col>
      </Row>
      
      {/* 添加详细解释说明 */}
      <div className="network-explanation">
        <Divider orientation="left">
          <span className="explanation-title"><ExperimentOutlined /> 网络图说明</span>
        </Divider>
        <ul className="explanation-list">
          <li>
            <strong>节点大小</strong>：节点大小反映相似度，越大表示与目标疾病相似度越高。
          </li>
          <li>
            <strong>连接类型</strong>：实线表示疾病与疾病之间的相似性关系或疾病与基因/miRNA的关联关系；虚线表示两个相关节点之间的相对关系。
          </li>
          <li>
            <strong>交互方式</strong>：鼠标悬停可查看详情，点击疾病节点可导航至该疾病的详细信息，拖动可调整网络布局。
          </li>
          <li>
            <strong>分子标记</strong>：方形节点代表基因，三角形节点代表miRNA，它们是连接不同疾病的分子中介。点击这些节点可以跳转到外部数据库查看详细信息。
          </li>
        </ul>
      </div>
    </Card>
  );
};

export default DiseaseSimilarityNetwork; 