import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Slider, Select, Row, Col, Spin, Alert, 
         Typography, Tag, List, Divider, Space, Statistic, Tooltip, Badge, Descriptions } from 'antd';
import { SearchOutlined, NodeIndexOutlined, SettingOutlined, QuestionCircleOutlined,
         ApiOutlined, InfoCircleOutlined, MedicineBoxOutlined, FileTextOutlined } from '@ant-design/icons';
import ForceGraph2D from 'react-force-graph-2d';
import apiService from '../utils/apiService';
import './DiseaseNetworkModel.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 疾病网络模型组件 - 基于RGMI预训练模型提供疾病相似性搜索和可视化
 */
const DiseaseNetworkModel = ({ onSelectDisease, language }) => {
  // 状态变量
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [diseaseId, setDiseaseId] = useState('');
  const [topN, setTopN] = useState(20);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [graphData, setGraphData] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [modelParameters, setModelParameters] = useState(null);
  const [similarDiseases, setSimilarDiseases] = useState([]);
  const [selectedDiseaseDetail, setSelectedDiseaseDetail] = useState(null);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // refs
  const graphRef = useRef();
  
  // 文本翻译函数
  const t = (zh, en) => language === 'zh' ? zh : en;
  
  // 初始化 - 检查API状态和获取模型信息
  useEffect(() => {
    const initializeComponent = async () => {
      setInitialLoading(true);
      try {
        // 检查API状态
        const apiStatus = await apiService.checkApiStatus();
        setApiConnected(apiStatus.connected);
        
        if (apiStatus.connected) {
          // 获取模型统计信息
          try {
            const stats = await apiService.getModelStats();
            setModelStats(stats);
          } catch (err) {
            console.warn('获取模型统计信息失败:', err);
          }
          
          // 获取模型参数
          try {
            const params = await apiService.getModelParameters();
            setModelParameters(params);
          } catch (err) {
            console.warn('获取模型参数失败:', err);
          }
          
          // 加载搜索历史
          loadSearchHistory();
        }
      } catch (err) {
        console.error('初始化组件失败:', err);
        setError(t('无法连接到API服务或初始化模型', 'Cannot connect to API service or initialize model'));
      } finally {
        setInitialLoading(false);
      }
    };
    
    initializeComponent();
  }, []);
  
  // 加载搜索历史
  const loadSearchHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('diseaseSearchHistory') || '[]');
      setSearchHistory(history.slice(0, 5)); // 限制只显示最近5条
    } catch (err) {
      console.error('加载搜索历史失败:', err);
      setSearchHistory([]);
    }
  };
  
  // 保存搜索历史
  const saveToSearchHistory = (disease) => {
    if (!disease || !disease.disease_id) return;
    
    try {
      const history = JSON.parse(localStorage.getItem('diseaseSearchHistory') || '[]');
      
      // 检查是否已存在相同记录
      const existingIndex = history.findIndex(item => item.id === disease.disease_id);
      if (existingIndex !== -1) {
        history.splice(existingIndex, 1); // 移除已存在的记录
      }
      
      // 添加新记录到最前面
      history.unshift({
        id: disease.disease_id,
        name: disease.name || disease.disease_id,
        timestamp: new Date().toISOString()
      });
      
      // 限制历史记录数量为20条
      const limitedHistory = history.slice(0, 20);
      
      // 保存回localStorage
      localStorage.setItem('diseaseSearchHistory', JSON.stringify(limitedHistory));
      
      // 更新状态
      setSearchHistory(limitedHistory.slice(0, 5));
    } catch (err) {
      console.error('保存搜索历史失败:', err);
    }
  };
  
  // 处理疾病ID输入变化
  const handleDiseaseIdChange = (e) => {
    setDiseaseId(e.target.value);
  };
  
  // 处理搜索按钮点击事件
  const handleSearch = async () => {
    if (!diseaseId || diseaseId.trim() === '') {
      return;
    }
    
    setSearchLoading(true);
    setError(null);
    
    try {
      // 请求疾病相似性预测
      const result = await apiService.predictDiseaseSimilarity(diseaseId.trim(), topN);
      
      if (!result || result.length === 0) {
        setError(t('未找到相似疾病', 'No similar diseases found'));
        setGraphData(null);
        setSimilarDiseases([]);
        setSelectedDiseaseDetail(null);
        setSearchLoading(false);
        return;
      }
      
      // 找到目标疾病
      const targetDisease = result.find(d => d.disease_id === diseaseId.trim()) || result[0];
      
      // 构建图数据
      buildGraphData(result, targetDisease);
      
      // 过滤相似度大于阈值的疾病
      const filteredDiseases = result.filter(d => 
        d.disease_id !== targetDisease.disease_id && 
        d.similarity >= similarityThreshold
      );
      
      // 更新状态
      setSimilarDiseases(filteredDiseases);
      setSelectedDiseaseDetail(targetDisease);
      
      // 保存到搜索历史
      saveToSearchHistory(targetDisease);
      
    } catch (err) {
      console.error('预测疾病相似性失败:', err);
      setError(err.message || t(
        '搜索疾病相似性时出错',
        'Error occurred when searching for disease similarity'
      ));
      setGraphData(null);
      setSimilarDiseases([]);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // 从历史记录中选择疾病
  const handleSelectFromHistory = (diseaseId) => {
    setDiseaseId(diseaseId);
    handleSearch();
  };
  
  // 处理相似度阈值更改
  const handleThresholdChange = (value) => {
    setSimilarityThreshold(value);
    
    // 如果已有结果，则重新过滤
    if (similarDiseases.length > 0 && selectedDiseaseDetail) {
      // 重新构建图数据
      buildGraphData([selectedDiseaseDetail, ...similarDiseases], selectedDiseaseDetail);
    }
  };
  
  // 构建图数据
  const buildGraphData = (diseases, targetDisease) => {
    if (!diseases || diseases.length === 0 || !targetDisease) return;
    
    const nodes = [];
    const links = [];
    
    // 添加目标疾病节点
    nodes.push({
      id: targetDisease.disease_id,
      name: targetDisease.name || targetDisease.disease_id,
      val: 20, // 大小
      color: '#ff464f', // 红色
      isTarget: true
    });
    
    // 添加相似疾病节点，应用相似度阈值过滤
    diseases.forEach(disease => {
      if (disease.disease_id !== targetDisease.disease_id && disease.similarity >= similarityThreshold) {
        // 添加节点
        nodes.push({
          id: disease.disease_id,
          name: disease.name || disease.disease_id,
          val: 10 + (disease.similarity * 10), // 根据相似度调整大小
          color: getNodeColor(disease.similarity), // 根据相似度设置颜色
          isTarget: false
        });
        
        // 添加连接
        links.push({
          source: targetDisease.disease_id,
          target: disease.disease_id,
          value: disease.similarity,
          color: getLinkColor(disease.similarity)
        });
      }
    });
    
    // 更新图数据
    setGraphData({ nodes, links });
  };
  
  // 处理图节点点击
  const handleNodeClick = (node) => {
    // 查找节点对应的疾病
    const disease = node.isTarget ? 
      selectedDiseaseDetail : 
      similarDiseases.find(d => d.disease_id === node.id);
    
    if (disease && typeof onSelectDisease === 'function') {
      onSelectDisease(disease);
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
    const opacity = Math.max(0.1, similarity);
    return `rgba(0, 123, 255, ${opacity})`;
  };
  
  // 渲染搜索表单
  const renderSearchForm = () => (
    <Card className="search-card">
      <Form layout="vertical" onFinish={handleSearch}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Form.Item 
              label={t("疾病ID", "Disease ID")}
              tooltip={t("输入疾病ID，如C0023212", "Enter a disease ID, e.g., C0023212")}
            >
              <Input
                value={diseaseId}
                onChange={handleDiseaseIdChange}
                placeholder="C0023212"
                prefix={<MedicineBoxOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label=" " className="search-button-form-item">
              <Button 
                type="primary" 
                onClick={handleSearch}
                loading={searchLoading}
                icon={<SearchOutlined />}
                size="large"
                block
              >
                {t("搜索相似疾病", "Search Similar Diseases")}
              </Button>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Form.Item 
              label={t("相似度阈值", "Similarity Threshold")}
              tooltip={t("设置最小相似度阈值，低于该值的疾病不会显示", "Set minimum similarity threshold. Diseases below this value won't be shown")}
            >
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={similarityThreshold}
                onChange={handleThresholdChange}
                marks={{
                  0: '0',
                  0.5: '0.5',
                  1: '1'
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item 
              label={t("返回结果数量", "Number of Results")}
              tooltip={t("设置返回的相似疾病数量上限", "Set maximum number of similar diseases to return")}
            >
              <Select value={topN} onChange={(value) => setTopN(value)}>
                <Option value={5}>5</Option>
                <Option value={10}>10</Option>
                <Option value={20}>20</Option>
                <Option value={50}>50</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      
      {searchHistory.length > 0 && (
        <div className="search-history">
          <Divider><Space><FileTextOutlined />{t("历史搜索", "Search History")}</Space></Divider>
          <List
            grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5 }}
            dataSource={searchHistory}
            renderItem={item => (
              <List.Item>
                <Tag 
                  color="blue" 
                  className="history-tag" 
                  onClick={() => handleSelectFromHistory(item.id)}
                >
                  {item.name || item.id}
                </Tag>
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );
  
  // 渲染模型统计信息
  const renderModelStats = () => {
    if (!modelStats) return null;
    
    return (
      <Card className="model-stats-card" title={<Space><ApiOutlined />{t("模型统计", "Model Statistics")}</Space>}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic 
              title={t("疾病数量", "Disease Count")}
              value={modelStats.disease_count || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic 
              title={t("基因数量", "Gene Count")}
              value={modelStats.gene_count || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic 
              title={t("miRNA数量", "miRNA Count")}
              value={modelStats.mirna_count || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic 
              title={t("模型版本", "Model Version")}
              value={modelStats.model_version || 'v1.0'}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };
  
  // 渲染图表
  const renderGraph = () => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return (
        <div className="empty-graph-placeholder">
          <InfoCircleOutlined className="placeholder-icon" />
          <Text>{t("输入疾病ID并点击搜索来查看相似疾病网络", "Enter a disease ID and click search to view the disease similarity network")}</Text>
        </div>
      );
    }
    
    return (
      <div className="graph-container">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={node => `${node.name} (${node.id})`}
          nodeColor={node => node.color}
          nodeRelSize={6}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const size = node.val * 0.5;
            const fontSize = 12/globalScale;
            const label = node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name;
            
            // Draw node
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = node.isTarget ? '#000' : '#fff';
            ctx.lineWidth = node.isTarget ? 2 : 0.5;
            ctx.stroke();
            
            // Draw label for target node or if zoomed in enough
            if (node.isTarget || globalScale > 0.8) {
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(node.x - ctx.measureText(label).width/2 - 2, node.y + size + 2, ctx.measureText(label).width + 4, fontSize + 2);
              ctx.fillStyle = '#000';
              ctx.fillText(label, node.x, node.y + size + 2 + fontSize/2);
            }
          }}
          linkWidth={link => Math.sqrt(link.value) * 5}
          linkColor={link => link.color}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current.zoomToFit(400)}
        />
        
        <div className="graph-legend">
          <div className="legend-title">{t("相似度等级", "Similarity Levels")}</div>
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
      </div>
    );
  };
  
  // 渲染相似疾病列表
  const renderSimilarDiseases = () => {
    if (!similarDiseases || similarDiseases.length === 0) {
      return null;
    }
    
    // 过滤相似度大于阈值的疾病
    const filteredDiseases = similarDiseases.filter(d => d.similarity >= similarityThreshold);
    
    if (filteredDiseases.length === 0) {
      return (
        <Alert
          type="info"
          showIcon
          message={t("无符合条件的相似疾病", "No similar diseases match the criteria")}
          description={t("请尝试降低相似度阈值", "Try lowering the similarity threshold")}
        />
      );
    }
    
    return (
      <Card 
        className="similar-diseases-card" 
        title={<Space><NodeIndexOutlined />{t("相似疾病", "Similar Diseases")}</Space>}
      >
        <List
          className="similar-disease-list"
          itemLayout="horizontal"
          dataSource={filteredDiseases}
          renderItem={disease => (
            <List.Item
              actions={[
                <Button 
                  type="link" 
                  onClick={() => handleNodeClick({ 
                    id: disease.disease_id, 
                    isTarget: false 
                  })}
                >
                  {t("查看详情", "View Details")}
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge 
                    count={
                      <span className="similarity-badge">
                        {(disease.similarity * 100).toFixed(0)}%
                      </span>
                    }
                  >
                    <div 
                      className="disease-node-icon" 
                      style={{ 
                        backgroundColor: getNodeColor(disease.similarity) 
                      }} 
                    />
                  </Badge>
                }
                title={disease.name || disease.disease_id}
                description={
                  <Space direction="vertical" size={1}>
                    <Text type="secondary">ID: {disease.disease_id}</Text>
                    {disease.attributes && disease.attributes.semantictype && (
                      <Tag color="green">{disease.attributes.semantictype}</Tag>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };
  
  // 渲染选中疾病详情
  const renderSelectedDiseaseDetail = () => {
    if (!selectedDiseaseDetail) return null;
    
    return (
      <Card 
        className="selected-disease-card" 
        title={<Space><InfoCircleOutlined />{t("当前疾病详情", "Current Disease Detail")}</Space>}
      >
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label={t("疾病ID", "Disease ID")}>
            {selectedDiseaseDetail.disease_id}
          </Descriptions.Item>
          
          <Descriptions.Item label={t("疾病名称", "Disease Name")}>
            {selectedDiseaseDetail.name || t("未知", "Unknown")}
          </Descriptions.Item>
          
          {selectedDiseaseDetail.definition && (
            <Descriptions.Item label={t("定义", "Definition")}>
              <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                {selectedDiseaseDetail.definition}
              </Paragraph>
            </Descriptions.Item>
          )}
          
          {selectedDiseaseDetail.attributes && selectedDiseaseDetail.attributes.semantictype && (
            <Descriptions.Item label={t("语义类型", "Semantic Type")}>
              <Tag color="blue">{selectedDiseaseDetail.attributes.semantictype}</Tag>
            </Descriptions.Item>
          )}
          
          {selectedDiseaseDetail.attributes && selectedDiseaseDetail.attributes.associated_gene_names && 
           selectedDiseaseDetail.attributes.associated_gene_names.length > 0 && (
            <Descriptions.Item label={t("关联基因", "Associated Genes")}>
              <div className="tag-list">
                {selectedDiseaseDetail.attributes.associated_gene_names.map((gene, index) => (
                  <Tag key={index} color="green">{gene}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
          
          {selectedDiseaseDetail.attributes && selectedDiseaseDetail.attributes.associated_miRNA_names && 
           selectedDiseaseDetail.attributes.associated_miRNA_names.length > 0 && (
            <Descriptions.Item label={t("关联miRNA", "Associated miRNAs")}>
              <div className="tag-list">
                {selectedDiseaseDetail.attributes.associated_miRNA_names.map((mirna, index) => (
                  <Tag key={index} color="volcano">{mirna}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    );
  };
  
  // 渲染主要内容
  const renderContent = () => {
    if (initialLoading) {
      return (
        <div className="loading-container">
          <Spin size="large" tip={t("加载中...", "Loading...")} />
        </div>
      );
    }
    
    if (!apiConnected) {
      return (
        <Alert
          type="error"
          showIcon
          message={t("API连接失败", "API Connection Failed")}
          description={t(
            "无法连接到后端API服务，请检查网络连接或联系系统管理员。",
            "Cannot connect to backend API service. Please check your network connection or contact system administrator."
          )}
        />
      );
    }
    
    if (error) {
      return (
        <Alert
          type="warning"
          showIcon
          message={t("错误", "Error")}
          description={error}
        />
      );
    }
    
    return (
      <div className="rgmi-model-content">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            {renderSearchForm()}
          </Col>
          
          {modelStats && (
            <Col span={24}>
              {renderModelStats()}
            </Col>
          )}
          
          <Col span={24}>
            <Card className="graph-card" title={<Space><NodeIndexOutlined />{t("疾病相似性网络", "Disease Similarity Network")}</Space>}>
              {searchLoading ? (
                <div className="loading-container">
                  <Spin tip={t("计算相似疾病中...", "Calculating similar diseases...")} />
                </div>
              ) : (
                renderGraph()
              )}
            </Card>
          </Col>
          
          {selectedDiseaseDetail && (
            <Col xs={24} md={12}>
              {renderSelectedDiseaseDetail()}
            </Col>
          )}
          
          {similarDiseases.length > 0 && (
            <Col xs={24} md={selectedDiseaseDetail ? 12 : 24}>
              {renderSimilarDiseases()}
            </Col>
          )}
        </Row>
      </div>
    );
  };
  
  return (
    <div className="disease-network-model-container">
      <Title level={2} className="page-title">
        <NodeIndexOutlined /> {t("疾病相似性网络模型", "Disease Similarity Network Model")}
      </Title>
      
      {renderContent()}
    </div>
  );
};

export default DiseaseNetworkModel; 