import React, { useState, useEffect } from 'react';
import { Input, Button, Card, List, Empty, Divider, Collapse, Tag, Badge, Typography, Tooltip, Spin } from 'antd';
import { SearchOutlined, HistoryOutlined, ClearOutlined, InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import './DiseaseSearchForm.css'; // 复用原有的CSS样式
import { useTranslation } from 'react-i18next';

const { Search } = Input;
const { Panel } = Collapse;
const { Text } = Typography;

/**
 * 疾病搜索表单组件
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.diseaseData - 疾病数据数组
 * @param {Function} props.onSearch - 搜索回调函数
 * @param {Array} props.history - 搜索历史
 * @param {Function} props.clearHistory - 清除历史回调
 * @param {Boolean} props.loading - 加载状态
 */
const NewDiseaseSearchForm = ({ diseaseData = [], onSearch, history = [], clearHistory, loading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState('recent');
  const [isSearching, setIsSearching] = useState(false);
  const { t, i18n } = useTranslation();

  // 当输入改变时更新搜索结果
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // 使用延迟以减少频繁搜索
    const timer = setTimeout(() => {
      const results = diseaseData.filter(disease => {
        const term = searchTerm.toLowerCase();
        // 同时匹配疾病ID和名称
        return (
          disease.disease_id.toLowerCase().includes(term) ||
          disease.name.toLowerCase().includes(term)
        );
      }).slice(0, 10); // 限制结果数量为10条

      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, diseaseData]);

  // 当历史记录变化时更新过滤后的历史
  useEffect(() => {
    filterHistory(selectedHistoryFilter);
  }, [history, selectedHistoryFilter]);

  // 过滤历史记录
  const filterHistory = (filter) => {
    setSelectedHistoryFilter(filter);
    let filtered = [...history];

    if (filter === 'recent') {
      filtered = filtered.slice(0, 5); // 最近5条
    } else if (filter === 'alphabetical') {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredHistory(filtered);
  };

  // 处理搜索表单提交
  const handleSearch = (value) => {
    if (!value || value.trim() === '') return;

    const results = diseaseData.filter(disease => {
      const term = value.toLowerCase();
      return (
        disease.disease_id.toLowerCase().includes(term) ||
        disease.name.toLowerCase().includes(term)
      );
    });

    if (results.length > 0) {
      onSearch(results);
    } else {
      onSearch([]);
    }
  };

  // 从历史中选择疾病
  const selectFromHistory = (diseaseId) => {
    const disease = diseaseData.find(d => d.disease_id === diseaseId);
    if (disease) {
      onSearch([disease]);
    }
  };

  // 清除历史
  const handleClearHistory = () => {
    if (clearHistory) {
      clearHistory();
    }
  };

  return (
    <div className="disease-search-form">
      <div className="search-header">
        <h2 className="search-title">{t('diseaseSearch')}</h2>
        <p className="search-description">{t('diseaseSearchDescription')}</p>
      </div>

      <div className="search-input-container">
        <Search
          placeholder={t('searchDiseasePlaceholder')}
          enterButton={<Button type="primary" icon={<SearchOutlined />}>{t('search')}</Button>}
          size="large"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
          loading={loading}
          className="search-input"
        />

        {isSearching && (
          <div className="search-loading">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        )}

        {searchTerm && searchResults.length > 0 && (
          <Card className="search-results-dropdown">
            <List
              size="small"
              dataSource={searchResults}
              renderItem={item => (
                <List.Item
                  className="search-result-item"
                  onClick={() => {
                    setSearchTerm('');
                    onSearch([item]);
                  }}
                >
                  <div className="search-result-content">
                    <div className="search-result-title">{item.name}</div>
                    <div className="search-result-id">{item.disease_id}</div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>

      <Divider />

      {history.length > 0 ? (
        <div className="search-history">
          <div className="history-header">
            <div className="history-title">
              <HistoryOutlined /> {t('searchHistory')}
            </div>
            <div className="history-actions">
              <Button 
                type="text" 
                danger 
                icon={<ClearOutlined />} 
                onClick={handleClearHistory}
                size="small"
              >
                {t('clearHistory')}
              </Button>
            </div>
          </div>

          <div className="history-filter">
            <Tag 
              color={selectedHistoryFilter === 'recent' ? 'blue' : 'default'}
              onClick={() => filterHistory('recent')}
              className="filter-tag"
            >
              {t('recent')}
            </Tag>
            <Tag 
              color={selectedHistoryFilter === 'alphabetical' ? 'blue' : 'default'}
              onClick={() => filterHistory('alphabetical')}
              className="filter-tag"
            >
              {t('alphabetical')}
            </Tag>
          </div>

          <List
            className="history-list"
            dataSource={filteredHistory}
            renderItem={item => (
              <List.Item 
                className="history-item"
                onClick={() => selectFromHistory(item.id)}
              >
                <Badge status="default" />
                <div className="history-item-content">
                  <div className="history-item-title">{item.name}</div>
                  <div className="history-item-meta">
                    <Text type="secondary" className="history-item-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    <Text type="secondary" className="history-item-id">
                      {item.id}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ) : (
        <Empty 
          description={t('noSearchHistory')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="empty-history"
        />
      )}

      <Divider />

      <Collapse className="search-help" ghost>
        <Panel header={t('searchHelp')} key="1">
          <ul className="help-list">
            <li>
              <Tooltip title={t('searchByNameTooltip')}>
                <InfoCircleOutlined /> {t('searchByName')}
              </Tooltip>
            </li>
            <li>
              <Tooltip title={t('searchByIdTooltip')}>
                <InfoCircleOutlined /> {t('searchById')}
              </Tooltip>
            </li>
            <li>
              <Tooltip title={t('searchHistoryTooltip')}>
                <InfoCircleOutlined /> {t('useSearchHistory')}
              </Tooltip>
            </li>
          </ul>
        </Panel>
      </Collapse>
    </div>
  );
};

export default NewDiseaseSearchForm; 