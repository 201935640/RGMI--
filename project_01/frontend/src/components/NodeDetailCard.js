import React from 'react';
import { Card, Typography, Divider, Tag, Button, Progress, Tooltip } from 'antd';
import { CloseOutlined, RightOutlined, SearchOutlined, ExperimentOutlined } from '@ant-design/icons';
import './NodeDetailCard.css';

const { Title, Text, Paragraph } = Typography;

/**
 * 显示选中疾病节点的详细信息卡片
 * Detail card displaying information about the selected disease node
 */
const NodeDetailCard = ({ disease, onClose, onViewDetails, similarityScale }) => {
  if (!disease) return null;

  // 获取疾病定义或描述，如果没有则显示默认信息
  // Get disease definition or description, show default if not available
  const getDefinition = () => {
    // 尝试从不同的属性中获取定义/描述
    // Try to get definition/description from different properties
    if (disease.english_definition && typeof window !== 'undefined' && 
        document.documentElement.lang === 'en') {
      return disease.english_definition;
    } else if (disease.attributes?.definition) {
      return disease.attributes.definition;
    } else if (disease.attributes?.summary) {
      return disease.attributes.summary;
    } else if (disease.definition) {
      return disease.definition;
    } else {
      return "暂无该疾病的详细描述信息。| No detailed description available for this disease.";
    }
  };

  // 获取语义类型，转换为更友好的显示
  // Get semantic type, convert to more friendly display
  const getSemanticType = () => {
    const type = disease.attributes?.semantictype || "未分类 | Unclassified";
    
    // 简化类型映射
    // Simplified type mapping
    const typeMap = {
      'Disease or Syndrome': '疾病或障碍 | Disease or Syndrome',
      'Neoplastic Process': '肿瘤过程 | Neoplastic Process',
      'Mental or Behavioral Dysfunction': '心理或行为障碍 | Mental or Behavioral Dysfunction',
      'Pathologic Function': '病理功能 | Pathologic Function',
      'Sign or Symptom': '症状或体征 | Sign or Symptom',
      'Congenital Abnormality': '先天性异常 | Congenital Abnormality',
      'Injury or Poisoning': '损伤或中毒 | Injury or Poisoning',
      'Anatomical Abnormality': '解剖异常 | Anatomical Abnormality'
    };
    
    return typeMap[type] || type;
  };

  // 格式化相似度为百分比
  // Format similarity as percentage
  const formatSimilarity = (similarity) => {
    if (similarity === -1 || similarity === undefined) return "基准疾病 | Baseline Disease";
    return `${(similarity * 100).toFixed(1)}%`;
  };

  // 获取相似度进度条颜色
  // Get similarity progress bar color
  const getSimilarityColor = (similarity) => {
    if (similarity === -1 || similarity === undefined) return "#e74c3c"; // 基准疾病为红色 / Baseline disease is red
    if (similarity >= 0.7) return "#52c41a"; // 高相似度为绿色 / High similarity is green
    if (similarity >= 0.4) return "#faad14"; // 中等相似度为黄色 / Medium similarity is yellow
    return "#f5222d"; // 低相似度为红色 / Low similarity is red
  };

  return (
    <Card 
      className="node-detail-card fade-in"
      variant="borderless"
      extra={
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={onClose}
          className="close-button"
        />
      }
    >
      <div className="card-header">
        <div className="disease-type-tag">
          <Tag color={disease.similarity === -1 ? "#e74c3c" : "#2db7f5"}>
            {disease.similarity === -1 ? "基准疾病 | Baseline Disease" : getSemanticType()}
          </Tag>
        </div>
        
        <Title level={4} className="disease-title">
          {disease.name || disease.id}
        </Title>
        
        <div className="disease-id">
          ID: {disease.id}
        </div>
      </div>
      
      {disease.similarity !== -1 && disease.similarity !== undefined && (
        <div className="similarity-section">
          <div className="similarity-header">
            <Text>相似度 | Similarity</Text>
            <Text strong className="similarity-value">
              {formatSimilarity(disease.similarity)}
            </Text>
          </div>
          <Progress 
            percent={disease.similarity * 100} 
            showInfo={false} 
            strokeColor={getSimilarityColor(disease.similarity)}
            trailColor="#f0f0f0"
            className="similarity-progress"
          />
          <div className="threshold-indicator">
            <div 
              className="threshold-marker"
              style={{ left: `${similarityScale * 100}%` }}
              title={`阈值 | Threshold: ${Math.round(similarityScale * 100)}%`}
            ></div>
          </div>
        </div>
      )}
      
      <Divider className="detail-divider" />
      
      <div className="definition-section">
        <div className="section-title">
          <ExperimentOutlined /> 疾病定义 | Disease Definition
        </div>
        <Paragraph 
          ellipsis={{ rows: 6, expandable: true, symbol: '展开 | Expand' }}
          className="definition-text"
        >
          {getDefinition()}
        </Paragraph>
      </div>
      
      {/* 如果有相关基因数据，显示基因信息 */}
      {/* If there's related gene data, show gene information */}
      {disease.genes && disease.genes.length > 0 && (
        <>
          <Divider className="detail-divider" />
          <div className="genes-section">
            <div className="section-title">
              相关基因 | Related Genes
            </div>
            <div className="gene-tags">
              {disease.genes.slice(0, 10).map((gene, index) => (
                <Tag key={index} color="blue">{gene}</Tag>
              ))}
              {disease.genes.length > 10 && (
                <Tooltip title={`还有${disease.genes.length - 10}个基因 | ${disease.genes.length - 10} more genes`}>
                  <Tag color="default">+{disease.genes.length - 10}</Tag>
                </Tooltip>
              )}
            </div>
          </div>
        </>
      )}
      
      <div className="card-actions">
        <Button 
          type="primary" 
          icon={<SearchOutlined />}
          onClick={() => onViewDetails(disease)}
          className="view-details-button"
        >
          查看详情 | View Details <RightOutlined />
        </Button>
      </div>
    </Card>
  );
};

export default NodeDetailCard; 