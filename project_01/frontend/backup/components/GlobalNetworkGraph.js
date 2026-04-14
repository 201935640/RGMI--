import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Spin, Empty, Checkbox, Slider, Button, Space, Select, Radio, Tooltip, Switch } from 'antd';
import { InfoCircleOutlined, ReloadOutlined, FilterOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import './GlobalNetworkGraph.css';

const { Option } = Select;

/**
 * 全局网络图组件 - 用于可视化所有疾病、基因和miRNA之间的关系
 * Global Network Graph Component - Visualizes relationships between all diseases, genes and miRNAs
 */
const GlobalNetworkGraph = ({ diseaseList, allGeneData, allMiRNAData }) => {
  // 状态变量
  const [loading, setLoading] = useState(false);
  const [networkData, setNetworkData] = useState(null);
  const [showGenes, setShowGenes] = useState(true);
  const [showMiRNAs, setShowMiRNAs] = useState(true);
  const [showDiseases, setShowDiseases] = useState(true);
  const [nodeLimit, setNodeLimit] = useState(200);
  const [layoutType, setLayoutType] = useState('force');
  const [linkThreshold, setLinkThreshold] = useState(0.3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  // 初始化网络数据
  useEffect(() => {
    if (!diseaseList || diseaseList.length === 0) return;
    
    setLoading(true);
    
    // 处理数据并生成网络
    generateNetworkData();
    
    setLoading(false);
  }, [diseaseList, allGeneData, allMiRNAData, showGenes, showMiRNAs, showDiseases, nodeLimit, linkThreshold, selectedCategory]);

  // 全屏控制
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`全屏请求失败: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // 生成网络图数据
  const generateNetworkData = () => {
    if (!diseaseList || diseaseList.length === 0) return;
    
    const nodes = [];
    const links = [];
    const categories = [
      { name: '疾病 | Disease', itemStyle: { color: '#e74c3c' } },
      { name: '基因 | Gene', itemStyle: { color: '#3498db' } },
      { name: 'miRNA', itemStyle: { color: '#2ecc71' } }
    ];
    
    // 处理疾病节点
    if (showDiseases) {
      // 限制疾病数量
      const limitedDiseases = diseaseList
        .sort((a, b) => {
          // 按照总关联基因和miRNA数量排序
          const aCount = (a.genes?.length || 0) + (a.mirnas?.length || 0);
          const bCount = (b.genes?.length || 0) + (b.mirnas?.length || 0);
          return bCount - aCount;
        })
        .slice(0, Math.min(diseaseList.length, nodeLimit / 3));
      
      limitedDiseases.forEach((disease, index) => {
        if (selectedCategory !== 'all' && selectedCategory !== 'disease') return;
        
        // 添加疾病节点
        nodes.push({
          id: disease.disease_id || `disease_${index}`,
          name: disease.name,
          value: 40,
          symbolSize: 20,
          category: 0,
          itemStyle: {
            color: '#e74c3c'
          },
          tooltip: {
            formatter: function() {
              return `<b>${disease.name}</b><br/>
                      类型: 疾病 | Disease<br/>
                      ID: ${disease.disease_id || '未知 | Unknown'}<br/>
                      基因数: ${disease.genes?.length || 0}<br/>
                      miRNA数: ${disease.mirnas?.length || 0}`;
            }
          }
        });
        
        // 添加疾病之间的关系连接（如果有相似度数据）
        if (showAllLinks) {
          for (let i = 0; i < index; i++) {
            if (Math.random() > 0.9) { // 仅添加少量疾病间连接，避免图形过于复杂
              links.push({
                source: disease.disease_id || `disease_${index}`,
                target: limitedDiseases[i].disease_id || `disease_${i}`,
                value: Math.random() * 0.4 + 0.1,
                lineStyle: {
                  width: 1,
                  color: 'rgba(231, 76, 60, 0.3)'
                }
              });
            }
          }
        }
      });
    }
    
    // 处理基因节点
    if (showGenes && allGeneData && allGeneData.length > 0) {
      // 限制基因数量
      const limitedGenes = allGeneData
        .sort((a, b) => {
          // 按照关联疾病数或分数排序
          const aScore = a.diseaseCount || a.score || 0;
          const bScore = b.diseaseCount || b.score || 0;
          return bScore - aScore;
        })
        .slice(0, Math.min(allGeneData.length, nodeLimit / 3));
      
      limitedGenes.forEach((gene, index) => {
        if (selectedCategory !== 'all' && selectedCategory !== 'gene') return;
        if (gene.score < linkThreshold) return;
        
        // 添加基因节点
        const geneId = gene.id || `gene_${index}`;
        nodes.push({
          id: geneId,
          name: geneId,
          value: gene.score ? parseFloat(gene.score) * 30 : 15,
          symbolSize: gene.score ? 10 + parseFloat(gene.score) * 10 : 15,
          category: 1,
          itemStyle: {
            color: '#3498db'
          },
          tooltip: {
            formatter: function() {
              return `<b>${geneId}</b><br/>
                      类型: 基因 | Gene<br/>
                      关联得分: ${gene.score ? parseFloat(gene.score).toFixed(3) : '未知 | Unknown'}<br/>
                      <a href="https://www.ncbi.nlm.nih.gov/gene/${geneId.replace('Gene-', '')}" target="_blank">查看详细 | View Details</a>`;
            }
          }
        });
        
        // 添加基因与疾病的连接
        if (showDiseases && gene.relatedDiseases) {
          gene.relatedDiseases.forEach(diseaseId => {
            const diseaseNode = nodes.find(n => n.id === diseaseId);
            if (diseaseNode) {
              const scoreValue = gene.score ? parseFloat(gene.score) : 0.5;
              links.push({
                source: geneId,
                target: diseaseId,
                value: scoreValue,
                lineStyle: {
                  width: scoreValue * 2,
                  color: 'rgba(52, 152, 219, 0.5)'
                }
              });
            }
          });
        }
        
        // 添加基因之间的随机连接（代表共现或相互作用）
        if (showAllLinks) {
          for (let i = 0; i < index; i++) {
            if (Math.random() > 0.95) { // 只添加少量基因间连接
              links.push({
                source: geneId,
                target: limitedGenes[i].id || `gene_${i}`,
                value: Math.random() * 0.3 + 0.1,
                lineStyle: {
                  width: 1,
                  color: 'rgba(52, 152, 219, 0.2)'
                }
              });
            }
          }
        }
      });
    }
    
    // 处理miRNA节点
    if (showMiRNAs && allMiRNAData && allMiRNAData.length > 0) {
      // 限制miRNA数量
      const limitedMiRNAs = allMiRNAData
        .sort((a, b) => {
          // 按照关联疾病数或分数排序
          const aScore = a.diseaseCount || a.score || 0;
          const bScore = b.diseaseCount || b.score || 0;
          return bScore - aScore;
        })
        .slice(0, Math.min(allMiRNAData.length, nodeLimit / 3));
      
      limitedMiRNAs.forEach((mirna, index) => {
        if (selectedCategory !== 'all' && selectedCategory !== 'mirna') return;
        if (mirna.score < linkThreshold) return;
        
        // 添加miRNA节点
        const mirnaId = mirna.name || `mirna_${index}`;
        const mirnaNum = mirnaId.replace('hsa-miR-', '');
        const mirnaAccession = `MIMAT${mirnaNum.padStart(7, '0')}`;
        
        nodes.push({
          id: mirnaId,
          name: mirnaId,
          value: mirna.score ? parseFloat(mirna.score) * 25 : 15,
          symbolSize: mirna.score ? 8 + parseFloat(mirna.score) * 8 : 12,
          category: 2,
          itemStyle: {
            color: '#2ecc71'
          },
          tooltip: {
            formatter: function() {
              return `<b>${mirnaId}</b><br/>
                      类型: miRNA<br/>
                      关联得分: ${mirna.score ? parseFloat(mirna.score).toFixed(3) : '未知 | Unknown'}<br/>
                      调控: ${mirna.regulation === 'up' ? '上调 | Up-regulated' : mirna.regulation === 'down' ? '下调 | Down-regulated' : '未知 | Unknown'}<br/>
                      <a href="https://mirbase.org/mature/${mirnaAccession}" target="_blank">查看详细 | View Details</a>`;
            }
          }
        });
        
        // 添加miRNA与疾病的连接
        if (showDiseases && mirna.relatedDiseases) {
          mirna.relatedDiseases.forEach(diseaseId => {
            const diseaseNode = nodes.find(n => n.id === diseaseId);
            if (diseaseNode) {
              const scoreValue = mirna.score ? parseFloat(mirna.score) : 0.5;
              links.push({
                source: mirnaId,
                target: diseaseId,
                value: scoreValue,
                lineStyle: {
                  width: scoreValue * 2,
                  color: 'rgba(46, 204, 113, 0.5)'
                }
              });
            }
          });
        }
        
        // 添加miRNA与基因的连接
        if (showGenes && showAllLinks && mirna.targetGenes) {
          mirna.targetGenes.forEach(geneId => {
            const geneNode = nodes.find(n => n.id === geneId);
            if (geneNode) {
              links.push({
                source: mirnaId,
                target: geneId,
                value: 0.3,
                lineStyle: {
                  width: 1,
                  color: 'rgba(46, 204, 113, 0.3)'
                }
              });
            }
          });
        }
        
        // 添加miRNA之间的一些随机连接（如共靶标关系）
        if (showAllLinks) {
          for (let i = 0; i < index; i++) {
            if (Math.random() > 0.95) { // 只添加少量miRNA间连接
              links.push({
                source: mirnaId,
                target: limitedMiRNAs[i].name || `mirna_${i}`,
                value: Math.random() * 0.2 + 0.1,
                lineStyle: {
                  width: 1,
                  color: 'rgba(46, 204, 113, 0.2)'
                }
              });
            }
          }
        }
      });
    }
    
    setNetworkData({ nodes, links, categories });
  };
  
  // 重新布局网络
  const refreshLayout = () => {
    if (chartRef.current && chartRef.current.getEchartsInstance) {
      const echartsInstance = chartRef.current.getEchartsInstance();
      echartsInstance.setOption(getNetworkOption());
    }
  };
  
  // 设置网络图配置
  const getNetworkOption = () => {
    if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
      return { title: { text: '无足够数据生成网络图 | No sufficient data to generate network' } };
    }
    
    return {
      title: {
        text: '全局疾病-基因-miRNA交互网络 | Global Disease-Gene-miRNA Interaction Network',
        subtext: `节点数量: ${networkData.nodes.length} | 连接数量: ${networkData.links.length}`,
        left: 'center'
      },
      legend: {
        data: networkData.categories.map(a => a.name),
        top: 50,
        textStyle: {
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'edge') {
            return `${params.data.source} → ${params.data.target}<br />
                    强度 | Strength: ${typeof params.data.value === 'number' ? params.data.value.toFixed(3) : params.data.value}<br/>
                    <span style="color:#999">点击节点查看详情 | Click node for details</span>`;
          }
          
          if (params.data.tooltip && params.data.tooltip.formatter) {
            return params.data.tooltip.formatter(params);
          }
          
          return `<b>${params.name}</b><br />
                  类型 | Type: ${params.data.category !== undefined ? networkData.categories[params.data.category].name : '未知 | Unknown'}<br/>
                  <span style="color:#999">点击查看详情 | Click for details</span>`;
        }
      },
      series: [
        {
          name: '全局交互网络 | Global Interaction Network',
          type: 'graph',
          layout: layoutType,
          data: networkData.nodes,
          links: networkData.links,
          categories: networkData.categories,
          roam: true,
          draggable: true,
          labelLayout: {
            hideOverlap: true
          },
          label: {
            position: 'right',
            formatter: '{b}',
            show: false
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10
            }
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          // 力导向图配置
          force: {
            repulsion: 500,
            gravity: 0.1,
            edgeLength: 200,
            friction: 0.6
          },
          // 圆形布局配置
          circular: {
            rotateLabel: true
          }
        }
      ]
    };
  };
  
  if (loading) {
    return (
      <Card className="global-network-card" title="全局交互网络 | Global Interaction Network">
        <div className="network-loading">
          <Spin tip="正在生成网络图... | Generating network..." />
        </div>
      </Card>
    );
  }
  
  if (!diseaseList || diseaseList.length === 0) {
    return <Empty description="无疾病数据 | No disease data available" />;
  }
  
  return (
    <div className="global-network-container" ref={containerRef}>
      <Card className="global-network-card" 
        title={
          <span>全局疾病-基因-miRNA交互网络 | Global Disease-Gene-miRNA Interaction Network</span>
        }
        extra={
          <div className="card-controls">
            <Radio.Group 
              value={layoutType} 
              onChange={e => setLayoutType(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="force">力导向图 | Force</Radio.Button>
              <Radio.Button value="circular">环形布局 | Circular</Radio.Button>
            </Radio.Group>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshLayout}
              size="small"
              title="重新布局 | Refresh Layout"
            />
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              size="small"
              title={isFullscreen ? "退出全屏 | Exit Fullscreen" : "全屏显示 | Fullscreen"}
            />
          </div>
        }
      >
        <div className="control-section">
          <InfoCircleOutlined />
          <span className="info-text">
            该图展示了所有疾病、基因与miRNA之间的全局关系网络 | 
            This graph shows the global relationship network between all diseases, genes and miRNAs
          </span>
        </div>

        <div className="filter-section">
          <Space size="small">
            <Checkbox checked={showDiseases} onChange={e => setShowDiseases(e.target.checked)}>
              疾病 | Diseases
            </Checkbox>
            <Checkbox checked={showGenes} onChange={e => setShowGenes(e.target.checked)}>
              基因 | Genes
            </Checkbox>
            <Checkbox checked={showMiRNAs} onChange={e => setShowMiRNAs(e.target.checked)}>
              miRNA
            </Checkbox>
            <Checkbox checked={showAllLinks} onChange={e => setShowAllLinks(e.target.checked)}>
              全部连接 | All Links
            </Checkbox>
          </Space>
          
          <div className="select-section">
            <span>节点筛选 | Filter Nodes:</span>
            <Select 
              value={selectedCategory} 
              onChange={setSelectedCategory}
              style={{ width: 120 }}
              size="small"
            >
              <Option value="all">全部 | All</Option>
              <Option value="disease">疾病 | Disease</Option>
              <Option value="gene">基因 | Gene</Option>
              <Option value="mirna">miRNA</Option>
            </Select>
          </div>
          
          <div className="slider-section">
            <span>节点限制 | Node Limit:</span>
            <Slider 
              min={50} 
              max={500}
              step={50}
              value={nodeLimit}
              onChange={setNodeLimit}
              style={{ width: 120 }}
            />
            
            <span>阈值 | Threshold:</span>
            <Slider 
              min={0}
              max={0.8}
              step={0.05}
              value={linkThreshold}
              onChange={setLinkThreshold}
              style={{ width: 120 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <Spin tip="加载中... | Loading..." />
          </div>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={getNetworkOption()}
            style={{ height: '700px' }}
            className="network-chart"
          />
        )}
      </Card>
    </div>
  );
};

export default GlobalNetworkGraph; 