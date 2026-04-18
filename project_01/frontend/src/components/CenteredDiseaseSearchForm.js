import React, { useState, useRef } from 'react';
import { Input, Button, List, Space, Empty, Typography, Tag, Divider, Tooltip, Slider, InputNumber, Row, Col } from 'antd';
import { SearchOutlined, LoadingOutlined, HistoryOutlined, BulbOutlined } from '@ant-design/icons';
import './CenteredDiseaseSearchForm.css';

const { Text, Title } = Typography;

/**
 * 疾病搜索表单组件 - 居中样式版本
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.diseaseData - 疾病数据数组
 * @param {Function} props.onSearch - 搜索回调函数
 * @param {Boolean} props.loading - 加载状态
 */
const CenteredDiseaseSearchForm = ({ diseaseData, onSearch, loading }) => {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [topN, setTopN] = useState(20);
  const inputRef = useRef(null);
  
  // 示例疾病
  const exampleDiseases = [
    { id: 'C2265792', name: 'Skeletal muscle hypertrophy' },
    { id: 'C4025845', name: 'Abnormality iris morphology' },
    { id: 'C1269683', name: 'Limb-girdle muscular dystrophy' }
  ];

  // 处理搜索词变化
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim() === '') {
      setResults([]);
      setShowResults(false);
      return;
    }

    // 搜索疾病
    const searchResults = searchDiseases(value);
    setResults(searchResults);
    setShowResults(true);
  };

  // 搜索疾病逻辑
  const searchDiseases = (term) => {
    if (!diseaseData || !Array.isArray(diseaseData)) {
      console.warn('疾病数据不可用或格式不正确');
      return [];
    }
    
    const lowerTerm = term.toLowerCase();
    
    // 检查是否是精确的疾病ID匹配
    if (term.startsWith('C') && /^C\d+$/.test(term)) {
      const exactMatch = diseaseData.find(disease => 
        disease.disease_id.toLowerCase() === lowerTerm
      );
      
      if (exactMatch) {
        return [exactMatch];
      }
    }
    
    // 否则进行模糊搜索
    return diseaseData.filter(disease => {
      const diseaseName = (disease.name || '').toLowerCase();
      const diseaseId = (disease.disease_id || '').toLowerCase();
      
      return diseaseName.includes(lowerTerm) || 
             diseaseId.includes(lowerTerm) ||
             (disease.chinese_name && disease.chinese_name.includes(term));
    }).slice(0, 10); // 限制最多显示10个结果
  };

  // 处理搜索结果选择
  const handleResultSelect = (disease) => {
    setSearchTerm('');
    setShowResults(false);
    onSearch(disease.disease_id, topN);
  };

  // 处理搜索提交
  const handleSubmit = () => {
    if (searchTerm.trim() === '') {
      return;
    }
    
    setShowResults(false);
    
    // 检查是否有确切的疾病ID匹配
    if (searchTerm.startsWith('C') && /^C\d+$/.test(searchTerm)) {
      onSearch(searchTerm, topN);
      return;
    }
    
    // 否则使用搜索结果的第一项
    if (results.length > 0) {
      onSearch(results, topN);
    } else {
      // 如果没有搜索结果，也尝试使用输入的搜索词作为疾病ID
      onSearch(searchTerm, topN);
    }
  };

  // 示例疾病点击
  const handleExampleClick = (disease) => {
    if (!disease || !disease.id) {
      console.error('示例疾病数据不完整:', disease);
      return;
    }

    console.log('点击示例疾病:', disease.id, disease.name);
    onSearch(disease.id, topN);
  };

  // 渲染组件
  return (
    <div className="centered-disease-search">
      <div className="search-container">
        {/* 顶部图标装饰 */}
        <div className="search-icon-wrapper">
          <SearchOutlined />
        </div>

        <div className="search-header">
          <Title level={2} className="search-title">疾病查询</Title>
          <Text className="search-subtitle">输入疾病名称或ID开始搜索相似疾病，探索基因关联网络</Text>
        </div>

        <div className="search-input-wrapper">
          <Space.Compact className="centered-search-input">
            <Input
              ref={inputRef}
              placeholder="输入疾病名称或ID (如 C2265792)"
              value={searchTerm}
              onChange={handleSearchChange}
              onPressEnter={handleSubmit}
              prefix={<SearchOutlined style={{ color: 'var(--primary-light)', fontSize: '20px' }} />}
              suffix={loading && <LoadingOutlined className="search-loading" />}
              allowClear
            />
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
            >
              搜索
            </Button>
          </Space.Compact>
          
          {showResults && results.length > 0 && (
            <div className="search-results-dropdown">
              <List
                size="small"
                bordered
                dataSource={results}
                renderItem={item => (
                  <List.Item
                    className="search-result-item"
                    onClick={() => handleResultSelect(item)}
                  >
                    <div className="search-result-content">
                      <div className="search-result-name">{item.name}</div>
                      <div className="search-result-id">{item.disease_id}</div>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>

        <div className="similar-disease-count">
          <Text>设置相似疾病返回数量:</Text>
          <Row gutter={16}>
            <Col span={18}>
              <Slider
                min={5}
                max={50}
                value={topN}
                onChange={(value) => setTopN(value)}
                marks={{
                  5: '5',
                  20: '20',
                  35: '35',
                  50: '50'
                }}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                min={5}
                max={50}
                value={topN}
                onChange={(value) => setTopN(value)}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </div>

        <Divider><Text type="secondary">或者选择示例疾病</Text></Divider>
        
        <div className="example-diseases">
          <Space wrap>
            {exampleDiseases.map(disease => (
              <Tag 
                key={disease.id}
                color="blue"
                onClick={() => handleExampleClick(disease)}
                className="example-disease-tag"
              >
                {disease.name}
              </Tag>
            ))}
          </Space>
        </div>
        
        <div className="search-tips">
          <Space>
            <BulbOutlined style={{ color: '#1a2980' }} />
            <Text type="secondary">提示: 可以使用疾病ID (如 C2265792) 或名称进行精确搜索</Text>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default CenteredDiseaseSearchForm; 