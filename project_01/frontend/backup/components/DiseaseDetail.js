import React, { useState, useEffect } from 'react';
import { Card, Tabs, Descriptions, Tag, List, Typography, Divider, Button, Row, Col, Spin, Alert, notification, Space } from 'antd';
import { DatabaseOutlined, LinkOutlined, InfoCircleOutlined, NodeIndexOutlined, GlobalOutlined, ApiOutlined } from '@ant-design/icons';
import './DiseaseDetail.css';
// 导入API服务
import apiService from '../utils/apiService';
// 导入可视化组件
import DiseaseNetworkGraph from './DiseaseNetworkGraph';
import { useTranslation } from 'react-i18next';
import EmptyStateGuide from './EmptyStateGuide';

const { TabPane } = Tabs;
const { Title, Paragraph, Text } = Typography;

/**
 * DiseaseDetail组件 - 显示疾病详细信息
 * DiseaseDetail Component - Displays disease details
 */
const DiseaseDetail = ({ disease, language = 'zh' }) => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(true);
  const [diseaseDetail, setDiseaseDetail] = useState(null);
  const [relatedDiseases, setRelatedDiseases] = useState([]);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(true); // 默认API已连接
  const [apiChecked, setApiChecked] = useState(false); // API检查状态
  
  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };
  
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
      return `https://www.ncbi.nlm.nih.gov/medgen/?term=${encodeURIComponent(disease?.name || '')}`;
    }
  };
  
  // 获取疾病详情数据
  useEffect(() => {
    if (!disease) return;
    
    setLoading(true);
    setActiveTab('1'); // 重置为第一个标签页
    
    // 清空旧数据
    setDiseaseDetail(null);
    setRelatedDiseases([]);
    
    // 添加请求取消标志
    let isMounted = true;
    
    // 获取疾病详情
    const fetchDiseaseData = async () => {
      try {
        // 先检查API连接状态
        const apiStatus = await apiService.checkApiStatus();
        setApiConnected(apiStatus.connected);
        
        // 如果API未连接，创建模拟数据
        if (!apiStatus.connected) {
          if (!isMounted) return;
          
          // 创建模拟疾病详情数据
          const mockDetail = {
            disease_id: disease.disease_id,
            name: disease.name || `模拟疾病 ${disease.disease_id}`,
            definition: "这是一个模拟的疾病定义，因为API服务不可用。",
            attributes: {
              semantictype: "Disease or Syndrome",
              associated_gene_names: ["GENE1", "GENE2", "GENE3"],
              associated_miRNA_names: ["miRNA1", "miRNA2", "miRNA3"]
            }
          };
          
          // 创建模拟相关疾病
          const mockRelatedDiseases = Array.from({ length: 5 }, (_, i) => ({
            disease_id: `C${10000 + i}`,
            name: `模拟相关疾病 ${i+1}`,
            similarity: Math.random().toFixed(2)
          }));
          
          setDiseaseDetail(mockDetail);
          setRelatedDiseases(mockRelatedDiseases);
          setLoading(false);
          return;
        }
        
        // API已连接，正常获取疾病详情
        const detail = await apiService.fetchDiseaseDetail(disease.disease_id);
        
        // 如果组件已卸载，不更新状态
        if (!isMounted) return;
        
        setDiseaseDetail(detail);
        
        // 提取相关疾病 - 从预测模型返回的数据中获取，而不是单独请求
        if (detail && Array.isArray(detail.similar_diseases)) {
          setRelatedDiseases(detail.similar_diseases);
        } else {
          // 备选方案：如果模型返回格式中没有similar_diseases字段，但有相似疾病的数据
          // 尝试查找预训练模型可能返回的其他格式
          const similarDiseases = [];
          
          // 检查模型是否将自身也作为结果返回
          if (Array.isArray(detail) && detail.length > 0) {
            // 找到目标疾病在数组中的索引
            const targetIndex = detail.findIndex(d => d.disease_id === disease.disease_id);
            
            if (targetIndex >= 0) {
              // 设置目标疾病详情
              setDiseaseDetail(detail[targetIndex]);
        
              // 其余的疾病是相似疾病
              for (let i = 0; i < detail.length; i++) {
                if (i !== targetIndex) {
                  similarDiseases.push(detail[i]);
                }
              }
              
              setRelatedDiseases(similarDiseases);
            } else {
              // 如果找不到目标疾病，将所有疾病都作为相似疾病
              setRelatedDiseases(detail);
            }
          } else {
            setRelatedDiseases([]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('获取疾病详情失败:', error);
        if (!isMounted) return;
        
        setError(t(
          '加载疾病详情数据失败，请稍后重试。',
          'Failed to load disease detail data, please try again later.'
        ));
        setLoading(false);
      }
    };
    
    fetchDiseaseData();
    
    // 组件卸载时的清理函数
    return () => {
      isMounted = false;
    };
  }, [disease, t]);

  // 处理重试连接按钮
  const handleRetryConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 重新检查API状态
      const apiStatus = await apiService.checkApiStatus();
      setApiConnected(apiStatus.connected);
      
      if (apiStatus.connected) {
        // API已连接，获取疾病详情
        const detail = await apiService.fetchDiseaseDetail(disease.disease_id);
        setDiseaseDetail(detail);
        
        // 提取相关疾病
        if (detail && Array.isArray(detail.similar_diseases)) {
          setRelatedDiseases(detail.similar_diseases);
        } else {
          setRelatedDiseases([]);
        }
        
        notification.success({
          message: t('连接成功', 'Connection Successful'),
          description: t('已成功连接到API服务', 'Successfully connected to the API service'),
          duration: 3
        });
      } else {
        // API未连接，使用模拟数据
        const mockDetail = {
          disease_id: disease.disease_id,
          name: disease.name || `模拟疾病 ${disease.disease_id}`,
          definition: "这是一个模拟的疾病定义，因为API服务不可用。",
          attributes: {
            semantictype: "Disease or Syndrome",
            associated_gene_names: ["GENE1", "GENE2", "GENE3"],
            associated_miRNA_names: ["miRNA1", "miRNA2", "miRNA3"]
          }
        };
        
        const mockRelatedDiseases = Array.from({ length: 5 }, (_, i) => ({
          disease_id: `C${10000 + i}`,
          name: `模拟相关疾病 ${i+1}`,
          similarity: Math.random().toFixed(2)
        }));
        
        setDiseaseDetail(mockDetail);
        setRelatedDiseases(mockRelatedDiseases);
        
        notification.warning({
          message: t('连接失败', 'Connection Failed'),
          description: t('无法连接到API服务，将使用模拟数据', 'Could not connect to API service, using mock data instead'),
          duration: 3
        });
      }
    } catch (error) {
      console.error('重试连接失败:', error);
      setError(t(
        '重试连接失败，请稍后再试。',
        'Retry connection failed, please try again later.'
      ));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理相关疾病点击
  const handleRelatedDiseaseClick = (relatedDisease) => {
    try {
      if (!relatedDisease || !relatedDisease.disease_id) {
        console.warn('无效的相关疾病数据:', relatedDisease);
        return;
      }
      
      console.log(`点击了相关疾病: ${relatedDisease.name} (${relatedDisease.disease_id})`);
      
      // 获取相关疾病的详情
      const loadRelatedDiseaseDetail = async () => {
        try {
          // 先更新状态为加载中
          setLoading(true);
          setError(null);
          
          // 获取新的疾病详情
          const detailData = await apiService.fetchDiseaseDetail(relatedDisease.disease_id);
          
          // 更新为新疾病
          if (detailData) {
            // 更新疾病详情
            setDiseaseDetail(detailData);
            
            // 提取相关疾病数据
            if (detailData && Array.isArray(detailData.similar_diseases)) {
              setRelatedDiseases(detailData.similar_diseases);
            } else {
              setRelatedDiseases([]);
            }
          } else {
            throw new Error(`未能获取疾病详情: ${relatedDisease.disease_id}`);
          }
          
          // 完成加载
          setLoading(false);
        } catch (err) {
          console.error('加载相关疾病详情失败:', err);
          setError(t(
            '加载相关疾病详情数据失败，请稍后重试。',
            'Failed to load related disease detail data, please try again later.'
          ));
          setLoading(false);
        }
      };
      
      // 执行加载
      loadRelatedDiseaseDetail();
    } catch (error) {
      console.error('处理相关疾病点击时出错:', error);
      setError(t(
        '处理相关疾病点击时出错，请刷新页面后重试。',
        'Error processing related disease click, please refresh the page and try again.'
      ));
    }
  };
  
  // 如果没有选择疾病，显示提示信息
  if (!disease) {
    return (
      <div className="no-disease-container">
        <Alert
          message={t("未选择疾病", "No Disease Selected")}
          description={t(
            "请先从疾病网络中选择一个疾病以查看详细信息。",
            "Please select a disease from the disease network to view detailed information."
          )}
          type="info"
          showIcon
        />
      </div>
    );
  }
  
  // 如果API状态尚未检查完成，显示加载状态
  if (!apiChecked) {
    return (
      <div className="loading-container">
        <Spin tip={t('正在检查API状态...', 'Checking API status...')} />
      </div>
    );
  }
  
  // 渲染疾病基本信息卡片
  const renderDiseaseInfoCard = () => {
    const detail = diseaseDetail || disease;
    if (!detail) return null;
    
    // 获取外部数据库链接
    const { medGenLink, omimLink, meshLink } = apiService.generateExternalLinks(detail);
    
    return (
      <Card 
        className="disease-info-card"
        title={<Title level={4}>{t('疾病基本信息', 'Disease Information')}</Title>}
      >
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label={t('疾病ID', 'Disease ID')}>
            {detail.disease_id || t('未知', 'Unknown')}
          </Descriptions.Item>
          
          <Descriptions.Item label={t('疾病名称', 'Disease Name')}>
            {detail.name || t('未知', 'Unknown')}
          </Descriptions.Item>
          
          {detail.definition && (
            <Descriptions.Item label={t('定义', 'Definition')}>
              <Paragraph>
                {language === 'zh' 
                  ? detail.definition // 显示中文定义
                  : (detail.english_definition || detail.definition) // 如果有英文定义则显示英文，否则显示中文
                }
              </Paragraph>
            </Descriptions.Item>
          )}
          
          {/* 相似度得分 */}
          {detail.similarity !== undefined && (
            <Descriptions.Item label={t('相似度得分', 'Similarity Score')}>
              <Tag color={detail.similarity > 0.8 ? 'red' : detail.similarity > 0.5 ? 'orange' : 'green'}>
                {detail.similarity.toFixed(4)}
              </Tag>
            </Descriptions.Item>
          )}
          
          {/* 显示属性 */}
          {detail.attributes && detail.attributes.semantictype && (
            <Descriptions.Item label={t('语义类型', 'Semantic Type')}>
              <Tag color="geekblue">{detail.attributes.semantictype}</Tag>
            </Descriptions.Item>
          )}
          
          {/* 关联基因 */}
          {detail.attributes && detail.attributes.associated_gene_names && detail.attributes.associated_gene_names.length > 0 && (
            <Descriptions.Item label={t('关联基因', 'Associated Genes')}>
              <div className="tag-container">
                {detail.attributes.associated_gene_names.map((gene, index) => (
                  <Tag key={index} color="processing">{gene}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
          
          {/* 关联miRNA */}
          {detail.attributes && detail.attributes.associated_miRNA_names && detail.attributes.associated_miRNA_names.length > 0 && (
            <Descriptions.Item label={t('关联miRNA', 'Associated miRNAs')}>
              <div className="tag-container">
                {detail.attributes.associated_miRNA_names.map((mirna, index) => (
                  <Tag key={index} color="volcano">{mirna}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
          
          {/* 外部链接 */}
          <Descriptions.Item label={t('外部数据库', 'External Databases')}>
            <div className="external-links">
              <Button type="link" icon={<LinkOutlined />} href={medGenLink} target="_blank">
                MedGen
              </Button>
              <Button type="link" icon={<LinkOutlined />} href={omimLink} target="_blank">
                OMIM
              </Button>
              <Button type="link" icon={<LinkOutlined />} href={meshLink} target="_blank">
                MeSH
              </Button>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  };
  
  // 渲染相关疾病列表
  const renderRelatedDiseases = () => {
    if (!relatedDiseases || relatedDiseases.length === 0) {
      return (
        <Card 
          className="related-diseases-card"
          title={<Title level={4}>{t('相似疾病', 'Similar Diseases')}</Title>}
        >
          <Empty description={t('暂无相似疾病数据', 'No similar disease data available')} />
        </Card>
      );
    }
    
    return (
      <Card 
        className="related-diseases-card"
        title={<Title level={4}>{t('相似疾病', 'Similar Diseases')}</Title>}
      >
        <List
          itemLayout="horizontal"
          dataSource={relatedDiseases}
          renderItem={disease => (
            <List.Item
              actions={[
                <Button 
                  type="link" 
                  onClick={() => handleRelatedDiseaseClick(disease)}
                >
                  {t('查看', 'View')}
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<NodeIndexOutlined style={{ color: '#1890ff', fontSize: '20px' }} />}
                title={disease.name || disease.disease_id}
                description={
                  <>
                    <Tag>ID: {disease.disease_id}</Tag>
                    {disease.similarity !== undefined && 
                      <Tag color="blue">{t('相似度', 'Similarity')}: {disease.similarity.toFixed(4)}</Tag>
                    }
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };
  
  // 渲染主要内容
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin tip={t("加载中...", "Loading...")} size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message={t("加载错误", "Loading Error")}
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={handleRetryConnection}>
              {t("重试连接", "Retry Connection")}
            </Button>
          }
        />
      );
    }

    // 如果API未连接但仍需显示内容，添加警告提示
    const showApiWarning = !apiConnected && diseaseDetail;
    
    return (
      <div className="disease-detail-container">
        <Card 
          className="detail-card" 
          title={
            <Space>
              <NodeIndexOutlined />
              <span className="gradient-text">疾视 - {t('疾病详情', 'Disease Detail')}</span>
            </Space>
          }
        >
          {showApiWarning && (
            <Alert
              type="warning"
              message={t('API服务不可用', 'API Service Unavailable')}
              description={t('当前显示的是模拟数据。API服务不可用，某些功能可能受限。', 'Currently displaying mock data. API service is unavailable, some features may be limited.')}
              showIcon
              icon={<ApiOutlined />}
              action={
                <Button size="small" type="primary" onClick={handleRetryConnection}>
                  {t('重试连接', 'Retry Connection')}
                </Button>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Row gutter={[16, 16]}>
            <Col xs={24} md={24} lg={8}>
              {renderDiseaseInfoCard()}
              {renderRelatedDiseases()}
            </Col>
            
            <Col xs={24} md={24} lg={16}>
              <Card 
                className="visualizations-card"
                title={
                  <Space>
                    <NodeIndexOutlined />
                    <span>疾视 - {t('疾病相似性网络', 'Disease Similarity Network')}</span>
                  </Space>
                }
              >
                <DiseaseNetworkGraph 
                  disease={diseaseDetail} 
                  relatedDiseases={relatedDiseases}
                  onNodeClick={handleRelatedDiseaseClick}
                  language={language}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    );
  };

  return (
    <div className="disease-detail-page">
      <Title level={2} className="detail-page-title">
        {(diseaseDetail?.name || disease?.name) || (disease?.disease_id ? `Disease ${disease.disease_id}` : t('未知疾病', 'Unknown Disease'))}
        <Tag color="red" className="detail-page-id">
          ID: {disease?.disease_id || t('未知', 'Unknown')}
        </Tag>
      </Title>
      
      {renderContent()}
    </div>
  );
};

export default DiseaseDetail; 