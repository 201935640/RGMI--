import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Switch, Tooltip, notification, Spin } from 'antd';
import { InfoCircleOutlined, BgColorsOutlined, NodeIndexOutlined, AppstoreOutlined } from '@ant-design/icons';
import * as d3 from 'd3';
import NetworkControls from './NetworkControls';
import NodeDetailCard from './NodeDetailCard';
import './DiseaseNetwork.css';

const DiseaseNetwork = ({ diseaseData, onDiseaseSelect }) => {
  const networkRef = useRef(null);
  const containerRef = useRef(null);
  const [is3DView, setIs3DView] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [filteredData, setFilteredData] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomTransform, setZoomTransform] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 新增控制状态
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3); // 相似度阈值
  const [colorMode, setColorMode] = useState('similarity'); // 着色方式
  const [labelMode, setLabelMode] = useState('hover'); // 标签显示模式
  const [layoutMode, setLayoutMode] = useState('force'); // 网络布局方式
  const [nodeScale, setNodeScale] = useState(1); // 节点尺寸缩放
  const [linkScale, setLinkScale] = useState(1); // 连接线宽度缩放
  const [forceStrength, setForceStrength] = useState(1); // 物理力强度
  
  // 处理数据，构建网络图所需的节点和连接
  useEffect(() => {
    if (!diseaseData || diseaseData.length === 0) return;
    
    setLoading(true);
    
    // 基准疾病（第一个疾病）
    const baseDisease = diseaseData[0];
    
    // 应用相似度阈值过滤
    const filtered = diseaseData.filter((disease, index) => {
      // 始终包含基准疾病
      if (index === 0) return true;
      // 根据相似度阈值过滤
      return disease.similarity >= similarityThreshold;
    });
    
    setFilteredData(filtered);
    
    // 为节点分配类别，基于语义类型
    const categorizeNode = (disease) => {
      if (!disease.attributes || !disease.attributes.semantictype) return 0;
      
      const semanticType = disease.attributes.semantictype.toLowerCase();
      // 根据不同语义类型分配不同类别
      if (semanticType.includes('disease') || semanticType.includes('disorder')) return 1;
      if (semanticType.includes('syndrome')) return 2;
      if (semanticType.includes('injury') || semanticType.includes('trauma')) return 3;
      if (semanticType.includes('abnormality') || semanticType.includes('defect')) return 4;
      return 0; // 默认类别
    };
    
    // 根据布局模式设置初始位置
    const getInitialPosition = (index, totalNodes) => {
      if (index === 0) return { x: 0, y: 0 }; // 中心节点
      
      switch (layoutMode) {
        case 'radial':
          // 放射状布局
          return {
            x: 300 * Math.cos(index * (2 * Math.PI / (totalNodes - 1))),
            y: 300 * Math.sin(index * (2 * Math.PI / (totalNodes - 1)))
          };
        case 'cluster':
          // 聚类布局 - 基于类别分组
          const category = categorizeNode(filtered[index]);
          const angleOffset = category * (Math.PI / 4);
          const radius = 200 + (category * 50);
          return {
            x: radius * Math.cos(index * (2 * Math.PI / (totalNodes - 1)) + angleOffset),
            y: radius * Math.sin(index * (2 * Math.PI / (totalNodes - 1)) + angleOffset)
          };
        default:
          // 默认力导向随机布局
          return {
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500
          };
      }
    };
    
    // 根据色彩模式获取节点颜色
    const getNodeColor = (disease, index) => {
      if (index === 0) return '#e74c3c'; // 基准疾病始终为红色
      
      switch (colorMode) {
        case 'category':
          // 基于语义类型的颜色
          const category = categorizeNode(disease);
          const categoryColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];
          return categoryColors[category % categoryColors.length];
        case 'significance':
          // 基于重要性的颜色
          return d3.interpolateRdYlBu(1 - disease.similarity);
        default:
          // 默认基于相似度的颜色
          return d3.interpolateBlues(disease.similarity);
      }
    };
    
    // 构建网络节点和链接
    const nodes = filtered.map((disease, index) => {
      const initialPos = getInitialPosition(index, filtered.length);
      
      return {
        id: disease.disease_id,
        name: disease.name,
        value: index === 0 ? 35 : 15 + (disease.similarity * 12), // 节点大小
        color: getNodeColor(disease, index),
        disease: disease,
        category: categorizeNode(disease),
        // 添加初始位置
        x: initialPos.x,
        y: initialPos.y,
        // 固定基准疾病位置
        fx: index === 0 ? 0 : null,
        fy: index === 0 ? 0 : null
      };
    });
    
    const links = [];
    
    // 创建连接模式
    if (layoutMode === 'cluster') {
      // 基于聚类的连接 - 同类别节点之间也有连接
      for (let i = 1; i < filtered.length; i++) {
        // 基准疾病到每个疾病的连接
        links.push({
          source: baseDisease.disease_id,
          target: filtered[i].disease_id,
          value: filtered[i].similarity * 2,
          isBaseline: true
        });
        
        // 同类别节点之间的连接 (可选，密度较大）
        for (let j = i + 1; j < filtered.length; j++) {
          if (categorizeNode(filtered[i]) === categorizeNode(filtered[j])) {
            // 同类别的节点之间添加较弱的连接
            links.push({
              source: filtered[i].disease_id,
              target: filtered[j].disease_id,
              value: Math.min(filtered[i].similarity, filtered[j].similarity),
              isBaseline: false
            });
          }
        }
      }
    } else {
      // 默认星型连接 - 仅连接基准疾病
      for (let i = 1; i < filtered.length; i++) {
        links.push({
          source: baseDisease.disease_id,
          target: filtered[i].disease_id,
          value: filtered[i].similarity * 2, // 连接粗细
          isBaseline: true
        });
      }
    }
    
    setNetworkData({ nodes, links });
    setLoading(false);
  }, [diseaseData, similarityThreshold, colorMode, layoutMode]);
  
  // 渲染网络图
  const renderNetwork = (data) => {
    if (!networkRef.current) return null;
    
    const container = networkRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 700;
    
    // 清除之前的svg
    d3.select(container).selectAll("*").remove();
    
    // 创建SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .classed("network-svg", true);

    // 创建一个容器组用于缩放
    const g = svg.append("g")
      .attr("class", "zoom-container");
    
    // 添加背景网格
    const gridSize = 50;
    const grid = g.append("g")
      .attr("class", "grid-lines");
    
    // 添加水平线
    for (let i = -Math.floor(height/2); i <= Math.floor(height/2); i += gridSize) {
      grid.append("line")
        .attr("x1", -width/2)
        .attr("y1", i)
        .attr("x2", width/2)
        .attr("y2", i)
        .attr("stroke", "#eee")
        .attr("stroke-width", 1);
    }
    
    // 添加垂直线
    for (let i = -Math.floor(width/2); i <= Math.floor(width/2); i += gridSize) {
      grid.append("line")
        .attr("x1", i)
        .attr("y1", -height/2)
        .attr("x2", i)
        .attr("y2", height/2)
        .attr("stroke", "#eee")
        .attr("stroke-width", 1);
    }
    
    // 创建力导向图
    const sim = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links)
        .id(d => d.id)
        .distance(180)
        .strength(0.1))
      .force("charge", d3.forceManyBody()
        .strength(-1000))
      .force("center", d3.forceCenter(0, 0).strength(0.05))
      .force("collision", d3.forceCollide().radius(d => d.value + 20))
      .force("x", d3.forceX().strength(0.02))
      .force("y", d3.forceY().strength(0.02));
    
    // 创建连接
    const link = g.append("g")
      .attr("stroke", "#ddd")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", d => Math.max(1, d.value * 2))
      .attr("class", "link-line");
    
    // 创建节点
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", d => `node-group ${d.id === data.nodes[0].id ? "central-node" : ""}`)
      .call(drag(sim))
      .on("mouseover", function(event, d) {
        // 悬停时临时固定节点位置
        d._tempFx = d.fx;
        d._tempFy = d.fy;
        d.fx = d.x;
        d.fy = d.y;
        
        // 高亮连接到此节点的边
        link.attr("class", l => {
          if (l.source.id === d.id || l.target.id === d.id) {
            return "link-line active-link";
          }
          return "link-line inactive-link";
        });
        
        // 提高悬停节点z-index
        d3.select(this).raise();
      })
      .on("mouseout", function(event, d) {
        // 恢复原始的固定状态
        d.fx = d._tempFx;
        d.fy = d._tempFy;
        delete d._tempFx;
        delete d._tempFy;
        
        // 还原所有连接线样式
        link.attr("class", "link-line");
      })
      .on("click", (event, d) => {
        // 点击节点选择疾病
        event.stopPropagation();
        setSelectedNode(d.disease);
        onDiseaseSelect(d.disease);
      });
    
    // 添加节点圆
    node.append("circle")
      .attr("r", d => d.value)
      .attr("fill", d => d.color)
      .attr("class", "node-circle");
    
    // 为中心节点添加额外的视觉指示
    node.filter(d => d.id === data.nodes[0].id)
      .append("circle")
      .attr("r", 45)
      .attr("fill", "none")
      .attr("stroke", "#e74c3c")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("class", "central-highlight");
    
    // 添加标题提示
    node.append("title")
      .text(d => `${d.name}\n相似度: ${d.disease.similarity ? (d.disease.similarity * 100).toFixed(1) + '%' : '基准疾病'}`);
    
    // 添加文本标签
    node.append("text")
      .text(d => {
        // 缩短显示名称
        const shortName = d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name;
        return shortName;
      })
      .attr("x", d => d.value + 5)
      .attr("y", 5)
      .attr("class", d => d.id === data.nodes[0].id ? "central-node-text" : "node-text")
      .attr("pointer-events", "none");
    
    // 添加缩放功能
    const zoom = d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomTransform(event.transform);
      });
    
    svg.call(zoom);
    
    // 初始缩放
    const initialScale = 0.7;
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(initialScale));
    
    // 更新力导向图
    sim.on("tick", () => {
      // 限制节点位置在视图范围内
      data.nodes.forEach(d => {
        d.x = Math.max(-width, Math.min(width, d.x));
        d.y = Math.max(-height, Math.min(height, d.y));
      });
      
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    setSimulation(sim);
    
    // 如果是3D视图，添加3D效果
    if (is3DView) {
      node.style("transform", d => `translate3d(0, 0, ${d.value * 2}px)`)
        .style("transform-style", "preserve-3d");
    }
    
    // 拖拽功能
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        d3.select(this).raise();
        d3.select(this).classed("dragging", true);
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        
        // 中心节点保持固定，其他节点保持现状（非悬停状态为自由）
        if (event.subject.id !== data.nodes[0].id) {
          // 拖拽结束时仍保持位置固定一段时间，避免突然跳动
          setTimeout(() => {
            // 如果此时没有鼠标悬停在节点上（没有临时fx/fy)，则释放
            if (!event.subject._tempFx && !event.subject._tempFy) {
              event.subject.fx = null;
              event.subject.fy = null;
            }
          }, 1000);
        }
        
        d3.select(this).classed("dragging", false);
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    // 清理函数
    return () => {
      // 移除事件监听器
      svg.on(".zoom", null);
      node.on("mouseover", null)
          .on("mouseout", null)
          .on("click", null);
      
      // 停止模拟
      sim.stop();
    };
  };
  
  // 切换2D/3D视图
  const handleViewToggle = (checked) => {
    setIs3DView(checked);
  };
  
  // 缩放控制
  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const svg = d3.select(networkRef.current).select("svg");
    const zoom = d3.zoom().on("zoom", (event) => {
      d3.select(networkRef.current).select(".zoom-container")
        .attr("transform", event.transform);
      setZoomTransform(event.transform);
    });
    const currentTransform = zoomTransform || d3.zoomIdentity;
    const newTransform = currentTransform.scale(1.2);
    svg.transition().duration(300).call(zoom.transform, newTransform);
  };
  
  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const svg = d3.select(networkRef.current).select("svg");
    const zoom = d3.zoom().on("zoom", (event) => {
      d3.select(networkRef.current).select(".zoom-container")
        .attr("transform", event.transform);
      setZoomTransform(event.transform);
    });
    const currentTransform = zoomTransform || d3.zoomIdentity;
    const newTransform = currentTransform.scale(0.8);
    svg.transition().duration(300).call(zoom.transform, newTransform);
  };
  
  const handleReset = () => {
    if (!networkRef.current) return;
    const svg = d3.select(networkRef.current).select("svg");
    const zoom = d3.zoom().on("zoom", (event) => {
      d3.select(networkRef.current).select(".zoom-container")
        .attr("transform", event.transform);
      setZoomTransform(event.transform);
    });
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.scale(0.7));
    
    // 如果选择了节点，取消选择
    setSelectedNode(null);
  };
  
  // 全屏切换
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // 监听全屏变化
  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
    };
  }, []);
  
  // 渲染网络图
  useEffect(() => {
    const cleanup = renderNetwork(networkData);
    
    // 组件卸载时停止模拟和动画
    return () => {
      if (simulation) {
        simulation.stop();
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [networkData, is3DView, labelMode]);
  
  return (
    <div className="network-visualization-container" ref={containerRef}>
      <Card 
        className="network-card"
        title="疾病相似性网络 | Disease Similarity Network"
        loading={loading}
      >
        <NetworkControls 
          setIs3DView={setIs3DView}
          is3DView={is3DView}
          similarityThreshold={similarityThreshold}
          setSimilarityThreshold={setSimilarityThreshold}
          colorMode={colorMode}
          setColorMode={setColorMode}
          labelMode={labelMode}
          setLabelMode={setLabelMode}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          diseaseCount={filteredData.length}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={selectedNode ? 18 : 24}>
            <div 
              ref={networkRef} 
              className={`network-container ${is3DView ? 'view-3d' : ''}`}
              onClick={() => setSelectedNode(null)} // 点击空白区域取消选择
            ></div>
          </Col>
          
          {selectedNode && (
            <Col xs={24} lg={6}>
              <NodeDetailCard 
                disease={selectedNode}
                onClose={() => setSelectedNode(null)}
                onViewDetails={onDiseaseSelect}
                similarityScale={similarityThreshold}
              />
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

export default DiseaseNetwork; 