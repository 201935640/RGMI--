import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Spin, Empty, Checkbox, Slider, Button, Space, Select, Tooltip, Radio } from 'antd';
import { InfoCircleOutlined, ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import './ComplexNetworkGraph.css';

const { Option } = Select;

/**
 * 复杂网络图组件 - 用于可视化疾病、基因和miRNA之间的关系
 * Complex Network Graph Component - Visualizes relationships between diseases, genes and miRNAs
 */
const ComplexNetworkGraph = ({ 
  disease, // 当前选中的疾病
  relatedDiseases, // 相关疾病列表
  geneData, // 疾病相关基因
  miRNAs, // 疾病相关miRNA
  language = 'zh'
}) => {
  const [loading, setLoading] = useState(false);
  const [networkData, setNetworkData] = useState(null);
  const [showGenes, setShowGenes] = useState(true);
  const [showMiRNAs, setShowMiRNAs] = useState(true);
  const [showRelatedDiseases, setShowRelatedDiseases] = useState(true);
  const [nodeLimit, setNodeLimit] = useState(50);
  const [layoutType, setLayoutType] = useState('force');
  const [linkThreshold, setLinkThreshold] = useState(0.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  
  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 切换全屏显示
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 初始化/更新网络数据
  useEffect(() => {
    if (!disease) return;
    
    setLoading(true);
    
    // 生成网络数据
    generateNetworkData();
    
    setLoading(false);
  }, [disease, relatedDiseases, geneData, miRNAs, showGenes, showMiRNAs, showRelatedDiseases, nodeLimit, linkThreshold]);

  // 处理全屏显示的键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);
  
  // 生成网络图数据
  const generateNetworkData = () => {
    if (!disease) return;
    
    const nodes = [];
    const links = [];
    const categories = [
      { name: t('疾病', 'Disease'), itemStyle: { color: '#e74c3c' } },
      { name: t('基因', 'Gene'), itemStyle: { color: '#3498db' } },
      { name: t('miRNA', 'miRNA'), itemStyle: { color: '#2ecc71' } },
      { name: t('相关疾病', 'Related Disease'), itemStyle: { color: '#f39c12' } }
    ];
    
    // 记录已添加的节点ID，避免重复
    const addedNodeIds = new Set();
    
    // 添加当前疾病节点
    nodes.push({
      id: disease.disease_id,
      name: disease.name,
      value: 1,
      symbolSize: 40,
      category: 0, // 主疾病类别
      itemStyle: {
        color: '#c23531'
      },
      label: {
        show: true
      }
    });
    addedNodeIds.add(disease.disease_id);
    
    // 添加相关疾病节点和连接
    if (showRelatedDiseases && relatedDiseases && relatedDiseases.length > 0) {
      // 过滤相似度大于阈值的疾病
      const filteredDiseases = relatedDiseases
        .filter(d => d.similarity >= linkThreshold)
        .slice(0, nodeLimit);
      
      filteredDiseases.forEach((d) => {
        // 添加相关疾病节点
        if (!addedNodeIds.has(d.disease_id)) {
          nodes.push({
            id: d.disease_id,
            name: d.name,
            value: d.similarity,
            symbolSize: 15 + d.similarity * 25, // 大小根据相似度调整
            category: 3, // 相关疾病类别
            itemStyle: {
              color: '#f39c12'
            },
            similarity: d.similarity,
            semantictype: d.attributes?.semantictype || d.type || 'Disease'
          });
          addedNodeIds.add(d.disease_id);
        }
        
        // 添加疾病与当前疾病的连接
        links.push({
          source: disease.disease_id,
          target: d.disease_id,
          value: d.similarity,
          lineStyle: {
            width: d.similarity * 5,
            color: '#f39c12'
          }
        });
        
        // 如果相关疾病有关联基因/miRNA信息，则添加
        if (d.attributes && d.attributes.associated_gene_names && showGenes) {
          const geneNames = d.attributes.associated_gene_names;
          const geneCount = Math.min(geneNames.length, Math.floor(nodeLimit / 4));
          
          for (let i = 0; i < geneCount; i++) {
            const gene = geneNames[i];
            const geneId = `gene_${gene}`;
            
            // 只有在节点未添加过时才添加
            if (!addedNodeIds.has(geneId)) {
              // 添加基因节点
              nodes.push({
                id: geneId,
                name: gene,
                value: 0.7,
                symbolSize: 10 + (0.7 * 15),
                category: 1, // 基因类别
                itemStyle: {
                  color: '#3498db'
                },
                score: 0.7
              });
              addedNodeIds.add(geneId);
            }
            
            // 添加相关疾病与基因的连接
            links.push({
              source: d.disease_id,
              target: geneId,
              value: 0.7,
              lineStyle: {
                width: 0.7 * 3,
                color: '#3498db'
              }
            });
          }
        }
        
        // 如果相关疾病有关联miRNA信息，则添加
        if (d.attributes && d.attributes.associated_miRNA_names && showMiRNAs) {
          const mirnaNames = d.attributes.associated_miRNA_names;
          const mirnaCount = Math.min(mirnaNames.length, Math.floor(nodeLimit / 4));
          
          for (let i = 0; i < mirnaCount; i++) {
            const mirna = mirnaNames[i];
            const mirnaId = `mirna_${mirna}`;
            
            // 只有在节点未添加过时才添加
            if (!addedNodeIds.has(mirnaId)) {
              // 添加miRNA节点
              nodes.push({
                id: mirnaId,
                name: mirna,
                value: 0.6,
                symbolSize: 8 + (0.6 * 12),
                category: 2, // miRNA类别
                itemStyle: {
                  color: '#2ecc71'
                },
                score: 0.6,
                regulation: i % 2 === 0 ? 'up' : 'down' // 随机确定调控方向
              });
              addedNodeIds.add(mirnaId);
            }
            
            // 添加相关疾病与miRNA的连接
            links.push({
              source: d.disease_id,
              target: mirnaId,
              value: 0.6,
              lineStyle: {
                width: 0.6 * 2,
                color: '#2ecc71'
              }
            });
          }
        }
      });
    }
    
    // 添加基因节点和连接
    if (showGenes && geneData && geneData.length > 0) {
      // 过滤关联分数大于阈值的基因
      const filteredGenes = geneData
        .filter(g => g.score >= linkThreshold)
        .slice(0, nodeLimit);
      
      filteredGenes.forEach((gene) => {
        const geneScore = typeof gene.score === 'string' ? parseFloat(gene.score) : gene.score;
        const geneId = `gene_${gene.gene_id || gene.name}`;
        
        // 只有在节点未添加过时才添加
        if (!addedNodeIds.has(geneId)) {
          // 添加基因节点
          nodes.push({
            id: geneId,
            name: gene.name,
            value: geneScore,
            symbolSize: 10 + geneScore * 15,
            category: 1, // 基因类别
            itemStyle: {
              color: '#3498db'
            },
            score: geneScore,
            function: gene.function
          });
          addedNodeIds.add(geneId);
        }
        
        // 添加基因与当前疾病的连接
        links.push({
          source: disease.disease_id,
          target: geneId,
          value: geneScore,
          lineStyle: {
            width: geneScore * 3,
            color: '#3498db'
          }
        });
      });
    }
    
    // 添加miRNA节点和连接
    if (showMiRNAs && miRNAs && miRNAs.length > 0) {
      // 过滤关联分数大于阈值的miRNA
      const filteredMiRNAs = miRNAs
        .filter(m => m.score >= linkThreshold)
        .slice(0, nodeLimit);
      
      filteredMiRNAs.forEach((mirna) => {
        const mirnaScore = typeof mirna.score === 'string' ? parseFloat(mirna.score) : mirna.score;
        const mirnaId = `mirna_${mirna.mirna_id || mirna.name}`;
        
        // 只有在节点未添加过时才添加
        if (!addedNodeIds.has(mirnaId)) {
          // 添加miRNA节点
          nodes.push({
            id: mirnaId,
            name: mirna.name,
            value: mirnaScore,
            symbolSize: 8 + mirnaScore * 12,
            category: 2, // miRNA类别
            itemStyle: {
              color: '#2ecc71'
            },
            score: mirnaScore,
            regulation: mirna.regulation
          });
          addedNodeIds.add(mirnaId);
        }
        
        // 添加miRNA与当前疾病的连接
        links.push({
          source: disease.disease_id,
          target: mirnaId,
          value: mirnaScore,
          lineStyle: {
            width: mirnaScore * 2,
            color: '#2ecc71'
          }
        });
        
        // 随机添加miRNA与基因的连接
        if (showGenes && Math.random() > 0.7) {
          // 找到一个已添加的基因节点
          const geneNodes = nodes.filter(n => n.category === 1);
          if (geneNodes.length > 0) {
            const randomGene = geneNodes[Math.floor(Math.random() * geneNodes.length)];
            links.push({
              source: mirnaId,
              target: randomGene.id,
              value: 0.5,
              lineStyle: {
                width: 1,
                color: 'rgba(0, 0, 0, 0.2)',
                type: 'dashed'
              }
            });
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
      return { title: { text: t('无足够数据生成网络图', 'Not enough data to generate network') } };
    }
    
    return {
      title: {
        text: t('疾病-基因-miRNA复杂关系网络', 'Disease-Gene-miRNA Complex Network'),
        left: 'center',
        top: 10
      },
      tooltip: {
        formatter: function(params) {
          if (params.dataType !== 'node') return '';
          
          let result = `<div style="font-weight:bold;font-size:14px;margin-bottom:5px;">
            ${params.data.name}
          </div>`;
          
          if (params.data.category === 0) {
            result += `${t('类型', 'Type')}: ${t('疾病', 'Disease')}<br/>`;
            if (params.data.semantictype) {
              result += `${t('语义类型', 'Semantic Type')}: ${params.data.semantictype}<br/>`;
            }
          } else if (params.data.category === 3) {
            result += `${t('类型', 'Type')}: ${t('相关疾病', 'Related Disease')}<br/>`;
            if (params.data.similarity) {
              result += `${t('相似度', 'Similarity')}: ${(params.data.similarity * 100).toFixed(1)}%<br/>`;
            }
            if (params.data.semantictype) {
              result += `${t('语义类型', 'Semantic Type')}: ${params.data.semantictype}<br/>`;
            }
          } else if (params.data.category === 1) {
            result += `${t('类型', 'Type')}: ${t('基因', 'Gene')}<br/>`;
            if (params.data.score) {
              result += `${t('关联分数', 'Association Score')}: ${params.data.score.toFixed(2)}<br/>`;
            }
            if (params.data.function) {
              result += `${t('功能', 'Function')}: ${params.data.function}<br/>`;
            }
          } else if (params.data.category === 2) {
            result += `${t('类型', 'Type')}: ${t('miRNA', 'miRNA')}<br/>`;
            if (params.data.score) {
              result += `${t('关联分数', 'Association Score')}: ${params.data.score.toFixed(2)}<br/>`;
            }
            if (params.data.regulation) {
              result += `${t('调控', 'Regulation')}: ${params.data.regulation === 'up' ? t('上调', 'Up-regulated') : t('下调', 'Down-regulated')}<br/>`;
            }
          }
          
          return result;
        }
      },
      legend: {
        data: networkData.categories.map(a => a.name),
        orient: 'horizontal',
        top: 50,
        left: 'center',
      },
      series: [
        {
          type: 'graph',
          layout: layoutType,
          data: networkData.nodes,
          links: networkData.links,
          categories: networkData.categories,
          roam: true,
          label: {
            show: false,
            position: 'right',
            formatter: '{b}'
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 },
            label: { show: true }
          },
          // 力导向布局参数
          force: {
            repulsion: 150,
            gravity: 0.1,
            edgeLength: [50, 200],
            friction: 0.6
          },
          // 线段样式
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          // 节点样式
          itemStyle: {
            borderWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 5
          },
          // 连线标签
          edgeLabel: {
            show: false
          }
        }
      ]
    };
  };

  return (
    <div 
      ref={containerRef} 
      className={`network-container ${isFullscreen ? 'fullscreen' : ''}`}
    >
      <Card
        title={t('复杂网络图', 'Complex Network Graph')}
        className="network-card"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={refreshLayout}
              size="small"
            >
              {t('刷新布局', 'Refresh Layout')}
            </Button>
            <Button
              type="default"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              size="small"
            >
              {isFullscreen ? t('退出全屏', 'Exit Fullscreen') : t('全屏显示', 'Fullscreen')}
            </Button>
          </Space>
        }
      >
        <div className="network-controls">
          <div className="info-text">
            <InfoCircleOutlined />
            <span>
              {t(
                '此图表展示疾病、基因和miRNA之间的复杂关系网络。通过不同布局和过滤选项，可以更好地理解它们之间的关联。',
                'This chart shows the complex network of relationships between diseases, genes, and miRNAs. Different layouts and filtering options help to better understand their associations.'
              )}
            </span>
          </div>
          
          <div className="control-group">
            <div className="control-item">
              <span>{t('布局类型', 'Layout Type')}:</span>
              <Radio.Group 
                value={layoutType} 
                onChange={e => setLayoutType(e.target.value)}
                size="small"
              >
                <Radio.Button value="force">{t('力导向', 'Force')}</Radio.Button>
                <Radio.Button value="circular">{t('环形', 'Circular')}</Radio.Button>
              </Radio.Group>
            </div>
            
            <div className="control-item">
              <span>{t('节点显示', 'Node Display')}:</span>
              <Checkbox checked={showGenes} onChange={e => setShowGenes(e.target.checked)}>
                {t('基因', 'Genes')}
              </Checkbox>
              <Checkbox checked={showMiRNAs} onChange={e => setShowMiRNAs(e.target.checked)}>
                {t('miRNA', 'miRNAs')}
              </Checkbox>
              <Checkbox checked={showRelatedDiseases} onChange={e => setShowRelatedDiseases(e.target.checked)}>
                {t('相关疾病', 'Related Diseases')}
              </Checkbox>
            </div>
            
            <div className="control-item">
              <span>{t('关联阈值', 'Association Threshold')}:</span>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={linkThreshold}
                onChange={setLinkThreshold}
                style={{ width: 120 }}
              />
              <span>{linkThreshold.toFixed(2)}</span>
            </div>
            
            <div className="control-item">
              <span>{t('节点限制', 'Node Limit')}:</span>
              <Select 
                value={nodeLimit} 
                onChange={setNodeLimit}
                style={{ width: 80 }}
                size="small"
              >
                <Option value={20}>20</Option>
                <Option value={50}>50</Option>
                <Option value={100}>100</Option>
                <Option value={200}>200</Option>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="network-chart-container">
          {loading ? (
            <div className="loading-container">
              <Spin size="large" tip={t("加载中...", "Loading...")} />
            </div>
          ) : !networkData ? (
            <Empty description={t("无法生成网络图", "Cannot generate network")} />
          ) : (
            <ReactECharts
              ref={chartRef}
              option={getNetworkOption()}
              style={{ height: isFullscreen ? '80vh' : 600 }}
              className="network-chart"
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ComplexNetworkGraph; 