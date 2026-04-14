import React, { useState, useEffect, useRef } from 'react';
import { Card, Drawer, Typography, Tabs, List, Tag, Divider, Space, Button, Tooltip, Switch, Spin } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined, InfoCircleOutlined, LinkOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import './CircosGraph.css';
import apiService from '../utils/apiService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * 环形关系图组件 - 可视化疾病-基因-miRNA之间的关系网络
 * Circular Relationship Diagram - Visualizes the relationship network between diseases, genes, and miRNAs
 */
const CircosGraph = ({ disease, relatedDiseases, genes, miRNAs, language = 'zh' }) => {
  // 状态变量
  const [loading, setLoading] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [showGenes, setShowGenes] = useState(true);
  const [showMiRNAs, setShowMiRNAs] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 更新数据时重新渲染图表
  useEffect(() => {
    if (disease && (genes || miRNAs || relatedDiseases)) {
      setLoading(true);
      // 添加延迟模拟数据处理
      setTimeout(() => {
        setLoading(false);
        setForceRender(prev => prev + 1);
      }, 500);
    }
  }, [disease, relatedDiseases, genes, miRNAs, showGenes, showMiRNAs, language]);

  // 切换全屏显示
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

  // 处理节点点击事件
  const handleNodeClick = (params) => {
    if (params.dataType === 'node') {
      const node = params.data;
      setSelectedNode(node);
      setDrawerOpen(true);
    }
  };

  // 渲染节点详情
  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    let title, content;
    
    switch (selectedNode.nodeType) {
      case 'disease':
        const diseaseLinks = getExternalLinks(selectedNode);
        title = (
          <div className="detail-drawer-title">
            <Title level={4}>{t('疾病详情', 'Disease Details')}</Title>
          </div>
        );
        content = (
          <div className="node-detail-content">
            <div className="detail-section">
              <Title level={5}>{t('基本信息', 'Basic Information')}</Title>
              <List size="small">
                <List.Item>
                  <Text strong>{t('疾病ID', 'Disease ID')}:</Text> {selectedNode.id.replace(/^[rd]-/, '')}
                </List.Item>
                <List.Item>
                  <Text strong>{t('疾病名称', 'Disease Name')}:</Text> {selectedNode.name}
                </List.Item>
                {selectedNode.similarity && (
                  <List.Item>
                    <Text strong>{t('相似度', 'Similarity')}:</Text> {(selectedNode.similarity * 100).toFixed(1)}%
                  </List.Item>
                )}
                {selectedNode.description && (
                  <List.Item>
                    <Text strong>{t('定义', 'Definition')}:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      {language === 'zh' 
                        ? selectedNode.description.split('This is')[0] // 只显示中文部分
                        : (selectedNode.description.includes('This is') 
                          ? 'This is' + selectedNode.description.split('This is')[1] // 只显示英文部分
                          : selectedNode.description) // 如果没有分隔，显示全部
                      }
                    </Paragraph>
                  </List.Item>
                )}
              </List>
            </div>
            
            <Divider />
            
            <div className="detail-section">
              <Title level={5}>{t('外部数据库', 'External Databases')}</Title>
              <div className="external-links">
                {diseaseLinks.map((link, index) => (
                  <Button 
                    key={index}
                    type="link" 
                    icon={<LinkOutlined />} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
        break;
        
      case 'gene':
        const geneLinks = getExternalLinks(selectedNode);
        title = (
          <div className="detail-drawer-title">
            <Title level={4}>{t('基因详情', 'Gene Details')}</Title>
          </div>
        );
        content = (
          <div className="node-detail-content">
            <div className="detail-section">
              <Title level={5}>{t('基本信息', 'Basic Information')}</Title>
              <List size="small">
                <List.Item>
                  <Text strong>{t('基因ID', 'Gene ID')}:</Text> {selectedNode.id.replace(/^g-/, '')}
                </List.Item>
                <List.Item>
                  <Text strong>{t('基因名称', 'Gene Name')}:</Text> {selectedNode.name}
                </List.Item>
                <List.Item>
                  <Text strong>{t('关联分数', 'Association Score')}:</Text> {selectedNode.score ? selectedNode.score.toFixed(2) : 'N/A'}
                </List.Item>
                {selectedNode.description && (
                  <List.Item>
                    <Text strong>{t('功能', 'Function')}:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      {language === 'zh' 
                        ? selectedNode.description.split('This is')[0] // 只显示中文部分
                        : (selectedNode.description.includes('This is') 
                          ? 'This is' + selectedNode.description.split('This is')[1] // 只显示英文部分
                          : selectedNode.description) // 如果没有分隔，显示全部
                      }
                    </Paragraph>
                  </List.Item>
                )}
              </List>
            </div>
            
            <Divider />
            
            <div className="detail-section">
              <Title level={5}>{t('外部数据库', 'External Databases')}</Title>
              <div className="external-links">
                {geneLinks.map((link, index) => (
                  <Button 
                    key={index}
                    type="link" 
                    icon={<LinkOutlined />} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
        break;
        
      case 'miRNA':
        const mirnaLinks = getExternalLinks(selectedNode);
        title = (
          <div className="detail-drawer-title">
            <Title level={4}>{t('miRNA详情', 'miRNA Details')}</Title>
          </div>
        );
        content = (
          <div className="node-detail-content">
            <div className="detail-section">
              <Title level={5}>{t('基本信息', 'Basic Information')}</Title>
              <List size="small">
                <List.Item>
                  <Text strong>{t('miRNA ID', 'miRNA ID')}:</Text> {selectedNode.id.replace(/^m-/, '')}
                </List.Item>
                <List.Item>
                  <Text strong>{t('miRNA名称', 'miRNA Name')}:</Text> {selectedNode.name}
                </List.Item>
                {selectedNode.accession && (
                  <List.Item>
                    <Text strong>{t('Accession编号', 'Accession Number')}:</Text> {selectedNode.accession}
                  </List.Item>
                )}
                <List.Item>
                  <Text strong>{t('关联分数', 'Association Score')}:</Text> {selectedNode.score ? selectedNode.score.toFixed(2) : 'N/A'}
                </List.Item>
                {selectedNode.regulation && (
                  <List.Item>
                    <Text strong>{t('调控', 'Regulation')}:</Text>
                    <Tag color={selectedNode.regulation === 'up' ? 'red' : 'green'}>
                      {selectedNode.regulation === 'up' ? t('上调', 'Up-regulated') : t('下调', 'Down-regulated')}
                    </Tag>
                  </List.Item>
                )}
              </List>
            </div>
            
            <Divider />
            
            <div className="detail-section">
              <Title level={5}>{t('外部数据库', 'External Databases')}</Title>
              <div className="external-links">
                {mirnaLinks.map((link, index) => (
                  <Button 
                    key={index}
                    type="link" 
                    icon={<LinkOutlined />} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
        break;
        
      default:
        title = <Title level={4}>{t('详情', 'Details')}</Title>;
        content = <Empty description={t('无详细信息', 'No detailed information available')} />;
    }
    
    return (
      <Drawer
        title={title}
        placement="right"
        width={350}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {content}
      </Drawer>
    );
  };

  // 获取外部数据库链接
  const getExternalLinks = (node) => {
    if (!node) return [];
    
    let nodeId = node.id;
    if (typeof nodeId === 'string') {
      // 去除前缀如 'd-', 'g-', 'm-'
      nodeId = nodeId.replace(/^[dgrm]-/, '');
    }
    
    const links = [];
    
    // 根据节点类型返回不同的外部链接
    switch (node.nodeType) {
      case 'disease':
        // 使用生成的外部链接
        const diseaseObj = {
          disease_id: nodeId,
          name: node.name
        };
        const { medGenLink, omimLink, meshLink } = apiService.generateExternalLinks(diseaseObj);
        
        links.push({
          name: 'MedGen',
          url: medGenLink
        });
        
        links.push({
          name: 'OMIM',
          url: omimLink
        });
        
        links.push({
          name: 'MeSH',
          url: meshLink
        });
        break;
      
      case 'gene':
        // NCBI Gene链接
        links.push({
          name: 'NCBI Gene',
          url: `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(node.name)}`
        });
        // GeneCards链接
        links.push({
          name: 'GeneCards',
          url: `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(node.name)}`
        });
        // UniProt链接
        links.push({
          name: 'UniProt',
          url: `https://www.uniprot.org/uniprot/?query=${encodeURIComponent(node.name)}`
        });
        break;
        
      case 'miRNA':
        // miRBase链接
        links.push({
          name: 'miRBase',
          url: `http://www.mirbase.org/cgi-bin/query.pl?terms=${encodeURIComponent(node.name)}`
        });
        // NCBI链接
        links.push({
          name: 'NCBI',
          url: `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(node.name)}`
        });
        // 如果有Accession，添加直接链接
        if (node.accession) {
          links.push({
            name: 'miRBase Accession',
            url: `http://www.mirbase.org/cgi-bin/mirna_entry.pl?acc=${encodeURIComponent(node.accession)}`
          });
        }
        break;
    }
    
    return links;
  };

  // 构建图表数据
  const getChartOption = () => {
    if (!disease || loading) {
      return {};
    }
    
    // 将使用的节点和连接添加到此数组
    const nodes = [];
    const links = [];
    
    // 记录已添加的节点，避免重复
    const addedNodeIds = new Set();
    
    // 添加疾病节点
    if (disease) {
      nodes.push({
        id: `d-${disease.disease_id}`,
        name: disease.name,
        value: 40,
        symbolSize: 40,
        itemStyle: {
          color: '#c23531'
        },
        nodeType: 'disease',
        description: disease.definition,
        label: {
          show: true,
          position: 'right',
          formatter: (params) => formatLabel(params.data.name)
        },
        emphasis: {
          label: {
            show: true
          }
        }
      });
      addedNodeIds.add(`d-${disease.disease_id}`);
    }

    // 添加相关疾病节点和连接
    if (relatedDiseases && relatedDiseases.length > 0) {
      // 对相关疾病按相似度排序，取前15个
      const sortedDiseases = [...relatedDiseases]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 15);
        
      sortedDiseases.forEach((d) => {
        if (!addedNodeIds.has(`rd-${d.disease_id}`)) {
          // 添加相关疾病节点
          nodes.push({
            id: `rd-${d.disease_id}`,
            name: d.name,
            value: 20 + d.similarity * 20,
            symbolSize: 20 + d.similarity * 20,
            itemStyle: {
              color: '#f39c12'
            },
            nodeType: 'disease',
            similarity: d.similarity,
            description: d.definition,
            label: {
              show: d.similarity > 0.9,
              position: 'right',
              formatter: (params) => formatLabel(params.data.name)
            },
            emphasis: {
              label: {
                show: true
              }
            }
          });
          addedNodeIds.add(`rd-${d.disease_id}`);
          
          // 添加与主疾病的连接
          links.push({
            source: `d-${disease.disease_id}`,
            target: `rd-${d.disease_id}`,
            value: d.similarity,
            lineStyle: {
              width: 3 * d.similarity,
              curveness: 0.2,
              color: '#f39c12'
            }
          });
          
          // 如果相关疾病有关联基因和miRNA，添加这些节点和连接
          if (showGenes && d.attributes && d.attributes.associated_gene_names && d.attributes.associated_gene_names.length > 0) {
            const diseaseGenes = d.attributes.associated_gene_names.slice(0, 3); // 每个相关疾病最多添加3个基因
            
            diseaseGenes.forEach(gene => {
              const geneId = `g-${gene}`;
              
              // 只有在节点未添加过时才添加
              if (!addedNodeIds.has(geneId)) {
                nodes.push({
                  id: geneId,
                  name: gene,
                  value: 15,
                  symbolSize: 15,
                  itemStyle: {
                    color: '#3498db'
                  },
                  nodeType: 'gene',
                  score: 0.7,
                  description: `这是基因${gene}的描述。This is the description of gene ${gene}.`,
                  emphasis: {
                    label: {
                      show: true
                    }
                  }
                });
                addedNodeIds.add(geneId);
              }
              
              // 添加与相关疾病的连接
              links.push({
                source: `rd-${d.disease_id}`,
                target: geneId,
                value: 0.7,
                lineStyle: {
                  width: 1.5,
                  curveness: 0.3,
                  color: '#3498db'
                }
              });
            });
          }
          
          if (showMiRNAs && d.attributes && d.attributes.associated_miRNA_names && d.attributes.associated_miRNA_names.length > 0) {
            const diseaseMiRNAs = d.attributes.associated_miRNA_names.slice(0, 2); // 每个相关疾病最多添加2个miRNA
            
            diseaseMiRNAs.forEach(mirna => {
              const mirnaId = `m-${mirna}`;
              
              // 只有在节点未添加过时才添加
              if (!addedNodeIds.has(mirnaId)) {
                nodes.push({
                  id: mirnaId,
                  name: mirna,
                  value: 12,
                  symbolSize: 12,
                  itemStyle: {
                    color: '#2ecc71'
                  },
                  nodeType: 'mirna',
                  score: 0.6,
                  description: `这是miRNA ${mirna}的描述。This is the description of miRNA ${mirna}.`,
                  emphasis: {
                    label: {
                      show: true
                    }
                  }
                });
                addedNodeIds.add(mirnaId);
              }
              
              // 添加与相关疾病的连接
              links.push({
                source: `rd-${d.disease_id}`,
                target: mirnaId,
                value: 0.6,
                lineStyle: {
                  width: 1,
                  curveness: 0.3,
                  color: '#2ecc71'
                }
              });
            });
          }
        }
      });
    }

    // 添加基因节点和连接
    if (showGenes && genes && genes.length > 0) {
      // 根据关联分数排序，取前20个
      const sortedGenes = [...genes]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      
      sortedGenes.forEach((gene) => {
        const geneId = `g-${gene.gene_id || gene.name}`;
        
        if (!addedNodeIds.has(geneId)) {
          nodes.push({
            id: geneId,
            name: gene.name,
            value: 15,
            symbolSize: 10 + gene.score * 15,
            itemStyle: {
              color: '#3498db'
            },
            nodeType: 'gene',
            score: gene.score,
            description: gene.function,
            emphasis: {
              label: {
                show: true
              }
            }
          });
          addedNodeIds.add(geneId);
        }
        
        // 添加与主疾病的连接
        links.push({
          source: `d-${disease.disease_id}`,
          target: geneId,
          value: gene.score,
          lineStyle: {
            width: 2 * gene.score,
            curveness: 0.1,
            color: '#3498db'
          }
        });
      });
    }

    // 添加miRNA节点和连接
    if (showMiRNAs && miRNAs && miRNAs.length > 0) {
      // 根据关联分数排序，取前15个
      const sortedMiRNAs = [...miRNAs]
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
      
      sortedMiRNAs.forEach((mirna) => {
        const mirnaId = `m-${mirna.mirna_id || mirna.name}`;
        
        if (!addedNodeIds.has(mirnaId)) {
          nodes.push({
            id: mirnaId,
            name: mirna.name,
            value: 12,
            symbolSize: 8 + mirna.score * 12,
            itemStyle: {
              color: '#2ecc71'
            },
            nodeType: 'mirna',
            score: mirna.score,
            description: `调控方向: ${mirna.regulation === 'up' ? '上调' : '下调'}`,
            emphasis: {
              label: {
                show: true
              }
            }
          });
          addedNodeIds.add(mirnaId);
        }
        
        // 添加与主疾病的连接
        links.push({
          source: `d-${disease.disease_id}`,
          target: mirnaId,
          value: mirna.score,
          lineStyle: {
            width: 2 * mirna.score,
            curveness: 0.1,
            color: '#2ecc71'
          }
        });
        
        // 随机添加miRNA与基因的连接，增加图的复杂度
        if (showGenes && Math.random() > 0.7) {
          // 从已添加的基因中选择一个
          const geneNodes = nodes.filter(n => n.id.startsWith('g-'));
          if (geneNodes.length > 0) {
            const randomGene = geneNodes[Math.floor(Math.random() * geneNodes.length)];
            links.push({
              source: mirnaId,
              target: randomGene.id,
              value: 0.5,
              lineStyle: {
                width: 1,
                curveness: 0.3,
                opacity: 0.5,
                type: 'dashed',
                color: 'rgba(0, 0, 0, 0.3)'
              }
            });
          }
        }
      });
    }

    // 格式化显示的节点信息
    const formatLabel = (name) => {
      if (name.length <= 10) return name;
      return name.substring(0, 8) + '...';
    };
    
    const categories = [
      { name: t('疾病', 'Disease') },
      { name: t('相关疾病', 'Related Disease') },
      { name: t('基因', 'Gene') },
      { name: t('miRNA', 'miRNA') }
    ];
    
    return {
      title: {
        text: t('环形关系图: ', 'Circular Relationship Diagram: ') + disease.name,
        left: 'center',
        top: 10
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'node') {
            const data = params.data;
            let result = `<div style="font-weight:bold">${data.name}</div>`;
            
            if (data.nodeType === 'disease') {
              result += data.similarity 
                ? `${t('类型', 'Type')}: ${t('相关疾病', 'Related Disease')}<br/>${t('相似度', 'Similarity')}: ${(data.similarity * 100).toFixed(1)}%` 
                : `${t('类型', 'Type')}: ${t('主疾病', 'Main Disease')}`;
            } else if (data.nodeType === 'gene') {
              result += `${t('类型', 'Type')}: ${t('基因', 'Gene')}<br/>${t('关联分数', 'Association Score')}: ${data.score.toFixed(2)}`;
            } else if (data.nodeType === 'mirna') {
              result += `${t('类型', 'Type')}: ${t('miRNA', 'miRNA')}<br/>${t('关联分数', 'Association Score')}: ${data.score.toFixed(2)}`;
            }
            
            return result;
          }
          return '';
        }
      },
      legend: [
        {
          data: categories.map(a => a.name),
          orient: 'vertical',
          right: 10,
          top: 20
        }
      ],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: t('环形关系网络', 'Circular Relationship Network'),
          type: 'graph',
          layout: 'circular',
          circular: {
            rotateLabel: true
          },
          data: nodes,
          links: links,
          categories: categories,
          roam: true,
          focusNodeAdjacency: true,
          center: ['50%', '50%'],
          // 调整布局
          force: {
            repulsion: 100,
            edgeLength: [100, 200]
          },
          // 节点样式
          itemStyle: {
            borderWidth: 1,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 5
          },
          // 边样式
          lineStyle: {
            curveness: 0.3,
            width: 2
          },
          // 标签样式
          label: {
            show: false,
            position: 'right',
            formatter: '{b}'
          },
          // 高亮样式
          emphasis: {
            scale: true,
            focus: 'adjacency',
            lineStyle: {
              width: 4
            }
          }
        }
      ]
    };
  };

  return (
    <div className="circos-container" ref={containerRef}>
      <Card
        className="circos-card"
        title={
          <span>{t('环形关系图', 'Circular Relationship Diagram')}</span>
        }
        extra={
          <Space>
            <Tooltip title={isFullscreen ? t("退出全屏", "Exit Fullscreen") : t("全屏显示", "Fullscreen")}>
              <Button 
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                size="small"
              />
            </Tooltip>
          </Space>
        }
      >
        <div className="card-controls">
          <div className="info-text">
            <InfoCircleOutlined />
            <span>
              {t(
                '该图展示了疾病-基因-miRNA之间的关系网络。点击节点可查看详细信息和外部数据库链接。',
                'This diagram shows the relationship network between diseases, genes, and miRNAs. Click on nodes to view detailed information and external database links.'
              )}
            </span>
          </div>
          
          <div className="display-options">
            <span>{t('显示选项', 'Display Options')}:</span>
            <div className="control-section">
              <span>{t('显示基因', 'Show Genes')}:</span>
              <Switch 
                checked={showGenes} 
                onChange={setShowGenes}
                size="small"
              />
            </div>
            <div className="control-section">
              <span>{t('显示miRNA', 'Show miRNAs')}:</span>
              <Switch 
                checked={showMiRNAs} 
                onChange={setShowMiRNAs}
                size="small"
              />
            </div>
          </div>
        </div>
        
        <div className="circos-chart-container">
          {loading ? (
            <div className="loading-container">
              <Spin tip={t("加载中...", "Loading...")} size="large" />
            </div>
          ) : (
            <ReactECharts
              ref={chartRef}
              option={getChartOption()}
              style={{ height: '600px', width: '100%' }}
              className="circos-chart"
              key={forceRender} // 强制重新渲染
              onEvents={{
                'click': handleNodeClick
              }}
            />
          )}
        </div>
      </Card>
      
      {renderNodeDetails()}
    </div>
  );
};

export default CircosGraph; 