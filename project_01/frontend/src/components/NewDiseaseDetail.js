import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tabs, Table, Typography, Tag, Divider, List, Statistic, Row, Col, Tooltip, Empty, Spin, Button } from 'antd';
import { 
  InfoCircleOutlined, 
  NodeIndexOutlined, 
  LinkOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  ExperimentOutlined,
  RightOutlined
} from '@ant-design/icons';
import './DiseaseDetail.css'; // 复用原有的CSS
import { useTranslation } from 'react-i18next';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

/**
 * 疾病详情组件
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.disease - 疾病对象
 * @param {String} props.language - 当前语言
 * @param {Boolean} props.loading - 加载状态
 * @param {Function} props.onSelectRelatedDisease - 选择相关疾病回调
 */
const NewDiseaseDetail = ({ 
  disease, 
  language = 'zh-CN', 
  loading = false,
  onSelectRelatedDisease 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [geneData, setGeneData] = useState([]);
  const [mirnaData, setMirnaData] = useState([]);
  const [relatedDiseases, setRelatedDiseases] = useState([]);
  const { t } = useTranslation();

  // 当疾病数据改变时处理数据
  useEffect(() => {
    if (!disease) return;

    // 处理基因数据
    const genes = disease.attributes?.associated_gene_names || [];
    const processedGenes = genes.map((gene, index) => ({
      key: index,
      name: gene,
      score: ((1 - index/genes.length) * 100).toFixed(2)
    }));
    setGeneData(processedGenes);

    // 处理miRNA数据
    const mirnas = disease.attributes?.associated_miRNA_names || [];
    const processedMirnas = mirnas.map((mirna, index) => ({
      key: index,
      name: mirna,
      score: ((1 - index/mirnas.length) * 100).toFixed(2)
    }));
    setMirnaData(processedMirnas);

    // 处理相关疾病
    if (Array.isArray(disease.related_diseases)) {
      setRelatedDiseases(disease.related_diseases);
    } else {
      setRelatedDiseases([]);
    }
  }, [disease]);

  // 获取疾病名称
  const getDiseaseName = () => {
    if (!disease) return '';
    return disease.name || '未知';
  };

  // 获取语义类型
  const getSemanticType = () => {
    if (!disease) return '';
    return disease.attributes?.semantictype || '未知';
  };

  // 没有疾病数据时显示空状态
  if (!disease && !loading) {
    return (
      <Card className="disease-detail-card">
        <Empty
          description={t('noDiseaseSelected')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // 加载中状态
  if (loading) {
    return (
      <Card className="disease-detail-card">
        <div className="loading-container">
          <Spin size="large" tip={t('loading')} />
        </div>
      </Card>
    );
  }

  // 相关疾病表格列定义 - 适应侧边栏
  const relatedDiseaseColumns = [
    {
      title: '疾病名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <div className="disease-name">
            <NodeIndexOutlined /> {text || '未知'}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: 80,
      render: (similarity) => {
        const score = similarity * 100;
        return `${score.toFixed(0)}%`;
      },
      sorter: (a, b) => a.similarity - b.similarity,
      defaultSortOrder: 'descend',
    },
    {
      title: '操作',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          icon={<RightOutlined />}
          onClick={() => onSelectRelatedDisease && onSelectRelatedDisease(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <Card className="disease-detail-card" style={{ color: 'white' }}>
      <div className="disease-header">
        <div className="disease-title-container">
          <Title 
            level={4} 
            className="disease-title"
            style={{ 
              color: 'white', 
              fontWeight: 'normal',
              fontSize: '18px'
            }}
          >
            <NodeIndexOutlined /> {getDiseaseName()}
          </Title>
          <div className="disease-id">
            <Tag color="blue">{disease.disease_id}</Tag>
            <Tag color="green">{getSemanticType()}</Tag>
          </div>
        </div>
      </div>

      <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.2)' }} />

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="disease-tabs"
        size="small"
        tabBarStyle={{ marginBottom: '8px', color: 'white' }}
      >
        <TabPane 
          tab={<span style={{ color: 'white' }}><InfoCircleOutlined />概览</span>} 
          key="overview"
        >
          <div className="tab-content sidebar-tab-content">
            <Card className="definition-card sidebar-card" style={{ color: 'white', background: 'rgba(0,0,0,0.2)' }}>
              <div className="definition-header" style={{ color: 'white' }}>
                <FileTextOutlined /> 定义
              </div>
              <Paragraph className="definition-text" ellipsis={{ rows: 3, expandable: true, symbol: '展开' }} style={{ color: 'white' }}>
                {disease.definition || "暂无定义信息"}
              </Paragraph>
            </Card>

            <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
              <Col span={12}>
                <Card className="attribute-card sidebar-mini-card" style={{ color: 'white', background: 'rgba(0,0,0,0.2)' }}>
                  <Statistic 
                    title={<span style={{ color: 'white' }}>相关基因</span>}
                    value={geneData.length}
                    prefix={<ExperimentOutlined />}
                    valueStyle={{ fontSize: '16px', color: 'white' }}
                  />
                </Card>
              </Col>

              <Col span={12}>
                <Card className="attribute-card sidebar-mini-card" style={{ color: 'white', background: 'rgba(0,0,0,0.2)' }}>
                  <Statistic 
                    title={<span style={{ color: 'white' }}>相关miRNA</span>}
                    value={mirnaData.length}
                    prefix={<ExperimentOutlined />}
                    valueStyle={{ fontSize: '16px', color: 'white' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        </TabPane>

        <TabPane 
          tab={<span style={{ color: 'white' }}><LinkOutlined />相关疾病</span>}
          key="related"
        >
          <div className="tab-content sidebar-tab-content">
            <Table 
              dataSource={relatedDiseases} 
              columns={relatedDiseaseColumns} 
              size="small"
              pagination={{ pageSize: 5 }}
              className="white-text-table"
              style={{ color: 'white' }}
              locale={{ emptyText: '没有相关疾病数据' }}
            />
          </div>
        </TabPane>

        <TabPane 
          tab={<span style={{ color: 'white' }}><ExperimentOutlined />基因</span>}
          key="genes"
        >
          <div className="tab-content sidebar-tab-content">
            <Table 
              dataSource={geneData} 
              columns={[
                {
                  title: '基因名称',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text) => (
                    <div className="gene-name">
                      <ExperimentOutlined /> {text}
                    </div>
                  ),
                },
                {
                  title: '关联评分',
                  dataIndex: 'score',
                  key: 'score',
                  width: 100,
                  render: (score) => `${score}%`,
                  sorter: (a, b) => a.score - b.score,
                  defaultSortOrder: 'descend',
                }
              ]} 
              size="small"
              pagination={{ pageSize: 5 }}
              className="white-text-table"
              style={{ color: 'white' }}
              locale={{ emptyText: '没有基因数据' }}
            />
              </div>
        </TabPane>

        <TabPane 
          tab={<span style={{ color: 'white' }}><ExperimentOutlined />miRNA</span>}
          key="mirna"
        >
          <div className="tab-content sidebar-tab-content">
            <Table 
              dataSource={mirnaData} 
              columns={[
                {
                  title: 'miRNA名称',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text) => (
                    <div className="mirna-name">
                      <ExperimentOutlined /> {text}
                    </div>
                  ),
                },
                {
                  title: '关联评分',
                  dataIndex: 'score',
                  key: 'score',
                  width: 100,
                  render: (score) => `${score}%`,
                  sorter: (a, b) => a.score - b.score,
                  defaultSortOrder: 'descend',
                }
              ]} 
              size="small"
              pagination={{ pageSize: 5 }}
              className="white-text-table"
              style={{ color: 'white' }}
              locale={{ emptyText: '没有miRNA数据' }}
            />
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default NewDiseaseDetail; 