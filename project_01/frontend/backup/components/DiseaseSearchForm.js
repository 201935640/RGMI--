import React, { useState, useEffect } from 'react';
import { Form, Input, Button, AutoComplete, Empty, Card, List, Tag, Divider, Typography, Space, Row, Col, Tabs, Avatar, Tooltip, notification } from 'antd';
import { SearchOutlined, NodeIndexOutlined, HistoryOutlined, InfoCircleOutlined, HeartOutlined, ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../utils/apiService';
import './DiseaseSearchForm.css';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const EXAMPLE_DISEASES = [
  { 
    id: "C0023212", 
    name: "左心衰竭", 
    description: "左心室无法提供足够的输出，表现为呼吸困难、端坐呼吸和肺淤血等症状。" 
  },
  { 
    id: "C0235527", 
    name: "右心室衰竭", 
    description: "右心室无法正常工作，常导致外周凹陷性水肿、腹水和肝肿大。" 
  },
  { 
    id: "C0018802", 
    name: "充血性心力衰竭", 
    description: "心脏无法以与组织需求相称的速率泵血的状态，常与心肌收缩缺陷有关。" 
  },
  { 
    id: "C0026848", 
    name: "肌病", 
    description: "与神经支配或神经肌肉接头损伤无关的肌肉疾病。" 
  }
];

const DiseaseSearchForm = ({ onSearch, onSelect, searchResults, selectedDisease }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [options, setOptions] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [activeTabKey, setActiveTabKey] = useState('search');
  const { t } = useTranslation();

  // 加载搜索历史
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5)); // 只显示最近5条
  }, []);

  // 处理搜索
  const handleSearch = async (values) => {
    if (!values.query || values.query.trim() === '') return;
    
    setLoading(true);
    try {
      // 保存到搜索历史
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      
      // 检查是否已存在相同查询，如果有则移除旧的
      const filteredHistory = history.filter(item => 
        item.query !== values.query
      );
      
      // 添加新的查询并限制数量
      const newHistory = [
        { 
          query: values.query, 
          timestamp: Date.now() 
        },
        ...filteredHistory
      ].slice(0, 10); // 最多保存10条
      
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      
      // 执行搜索
      const results = await apiService.searchDiseases(values.query);
      
      // 清空自动完成选项
      setOptions([]);
      
      // 传回结果
      onSearch(results);
    } catch (error) {
      console.error('搜索疾病时出错:', error);
      notification.error({
        message: '搜索失败',
        description: error.message || '无法完成搜索请求，请稍后重试',
        duration: 5
      });
    } finally {
      setLoading(false);
    }
  };

  // 使用防抖处理自动完成搜索
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleAutoCompleteSearch = (value) => {
    setSearchValue(value);
    
    // 清除之前的超时
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // 如果输入太短，直接清空选项
    if (!value || value.length < 2) {
      setOptions([]);
      return;
    }
    
    // 设置新的超时
    const newTimeout = setTimeout(async () => {
      try {
        const suggestions = await apiService.getDiseaseSuggestions(value);
        const formattedOptions = suggestions.map(disease => ({
          value: disease.name,
          label: (
            <div className="autocomplete-option">
              <span className="disease-name">{disease.name}</span>
              <span className="disease-id">({disease.disease_id})</span>
            </div>
          ),
          disease: disease
        }));
        setOptions(formattedOptions);
      } catch (error) {
        console.error('获取疾病建议时出错:', error);
        setOptions([]);
      }
    }, 300); // 300ms防抖延迟
    
    setSearchTimeout(newTimeout);
  };

  // 处理选择
  const handleSelect = (value, option) => {
    if (typeof onSelect === 'function') {
      onSelect(option.disease);
      form.resetFields();
      setOptions([]);
    } else {
      console.warn('onSelect is not a function or not provided');
    }
  };

  // 从历史记录中选择
  const selectFromHistory = (diseaseId) => {
    const disease = searchHistory.find(item => item.id === diseaseId);
    if (disease && typeof onSelect === 'function') {
      onSelect({ disease_id: disease.id, name: disease.name });
    } else if (disease) {
      console.warn('onSelect is not a function or not provided');
      // 可以添加备用处理方式或显示通知
      notification.warning({
        message: '功能未定义',
        description: '此功能暂不可用，请直接使用搜索功能',
        duration: 3
      });
    }
  };

  // 选择示例疾病
  const selectExampleDisease = (diseaseId) => {
    if (typeof onSelect === 'function') {
      onSelect({ disease_id: diseaseId, name: EXAMPLE_DISEASES.find(d => d.id === diseaseId).name });
    } else {
      console.warn('onSelect is not a function or not provided');
      // 可以添加备用处理方式或显示通知
      notification.warning({
        message: '功能未定义',
        description: '此功能暂不可用，请直接使用搜索功能',
        duration: 3
      });
    }
  };

  return (
    <Card className="search-form-wrapper interactive-hover disease-search-card" bordered={false}>
      <Title level={4} className="search-form-title">
        <SearchOutlined /> 疾病查询
      </Title>
      
      <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} className="search-tabs">
        <TabPane 
          tab={
            <span>
              <SearchOutlined /> 查询疾病
            </span>
          }
          key="search"
        >
          <Form
            form={form}
            onFinish={handleSearch}
            layout="vertical"
            className="slide-in-up"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={18}>
                <Form.Item
                  name="query"
                  label={<Text strong>请输入疾病名称或ID进行搜索</Text>}
                  tooltip="输入疾病名称、疾病ID或相关症状进行搜索"
                >
                  <AutoComplete
                    options={options}
                    onSearch={handleAutoCompleteSearch}
                    onSelect={handleSelect}
                    placeholder="输入疾病名称或ID"
                    className="search-autocomplete"
                    dropdownClassName="search-dropdown"
                    value={searchValue}
                    onChange={setSearchValue}
                  >
                    <Input 
                      size="large"
                      suffix={<InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                    />
                  </AutoComplete>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label=" " className="search-button-wrapper">
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    loading={loading}
                    htmlType="submit"
                    size="large"
                    className="search-button"
                  >
                    查询
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <div className="search-history slide-in-up" style={{ marginTop: 20 }}>
              <Divider>
                <Space>
                  <HistoryOutlined />
                  <Text>最近搜索</Text>
                </Space>
              </Divider>
              
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3 }}
                dataSource={searchHistory}
                renderItem={item => (
                  <List.Item>
                    <Card 
                      hoverable 
                      size="small" 
                      className="history-card"
                      onClick={() => selectFromHistory(item.id)}
                    >
                      <Card.Meta
                        avatar={<Avatar icon={<NodeIndexOutlined />} style={{ backgroundColor: '#1a2980' }} />}
                        title={item.name}
                        description={new Date(item.timestamp).toLocaleDateString()}
                      />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FileTextOutlined /> 常见疾病示例
            </span>
          }
          key="examples"
        >
          <div className="disease-examples-container">
            <Paragraph className="examples-intro">
              以下是几种常见疾病示例，点击卡片可查看详细信息。
            </Paragraph>
            
            <Row gutter={[16, 16]} className="example-cards">
              {EXAMPLE_DISEASES.map(disease => (
                <Col xs={24} sm={12} lg={12} key={disease.id}>
                  <Card 
                    hoverable 
                    className="example-disease-card"
                    onClick={() => selectExampleDisease(disease.id)}
                  >
                    <Space align="start">
                      <Avatar 
                        size={48} 
                        icon={<HeartOutlined />} 
                        style={{ backgroundColor: '#26d0ce' }} 
                      />
                      <div>
                        <div className="example-disease-title">{disease.name}</div>
                        <div className="example-disease-id">ID: {disease.id}</div>
                        <div className="example-disease-desc">{disease.description}</div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </TabPane>
      </Tabs>

      {/* 搜索结果展示（如果有的话） */}
      {searchResults && searchResults.length > 0 && (
        <div className="search-results slide-in-up" style={{ marginTop: 20 }}>
          <Divider>搜索结果</Divider>
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={searchResults}
            renderItem={disease => (
              <List.Item>
                <Card
                  hoverable
                  className={`result-card ${
                    selectedDisease && selectedDisease.disease_id === disease.disease_id
                      ? 'selected-result-card'
                      : ''
                  }`}
                  onClick={() => onSelect(disease)}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div className="result-card-header">
                      <div className="disease-title">{disease.name}</div>
                      <Tag color="blue">ID: {disease.disease_id}</Tag>
                    </div>
                    
                    {disease.definition && (
                      <Paragraph ellipsis={{ rows: 2 }} className="disease-definition">
                        {disease.definition}
                      </Paragraph>
                    )}
                    
                    {disease.attributes && disease.attributes.semantictype && (
                      <div className="disease-type">
                        <Tag color="green">{disease.attributes.semantictype}</Tag>
                      </div>
                    )}
                    
                    {disease.similarity !== undefined && disease.similarity !== -1 && (
                      <div className="similarity-score">
                        <Text type="secondary">相似度: </Text>
                        <Text strong>{(disease.similarity * 100).toFixed(2)}%</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}

      {searchResults && searchResults.length === 0 && (
        <Empty
          description="未找到相关疾病"
          className="slide-in-up"
          style={{ margin: '30px 0' }}
        />
      )}
    </Card>
  );
};

export default DiseaseSearchForm; 