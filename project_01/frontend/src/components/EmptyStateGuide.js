import React from 'react';
import { Result, Button, Steps, Card, Typography, Divider, Space } from 'antd';
import { ApiOutlined, DatabaseOutlined, SettingOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

/**
 * 空状态引导组件 - 在API不可用或数据为空时提供帮助信息
 * 
 * @param {Object} props
 * @param {string} props.type - 引导类型: 'api-error', 'no-data', 'search-empty'
 * @param {string} props.message - 可选的自定义消息
 * @param {function} props.onRetry - 重试按钮回调
 */
const EmptyStateGuide = ({ type = 'api-error', message, onRetry }) => {
  // API错误引导
  const renderApiErrorGuide = () => (
    <Result
      status="warning"
      title="API服务不可用"
      subTitle={message || "无法连接到API服务器，这可能是由于以下原因:"}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Steps direction="vertical" current={-1}>
              <Step 
                title="检查API服务器" 
                description="确保API服务器正在运行并且可以访问"
                icon={<ApiOutlined />}
              />
              <Step 
                title="检查网络连接" 
                description="确保您的网络连接正常"
                icon={<SettingOutlined />}
              />
              <Step 
                title="联系管理员" 
                description="如果问题持续存在，请联系系统管理员"
                icon={<QuestionCircleOutlined />}
              />
            </Steps>
          </Card>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" onClick={onRetry || (() => window.location.reload())}>
              重试连接
            </Button>
            
            {message && message.includes('示例数据') && (
              <Button type="default" onClick={onRetry}>
                使用示例数据
              </Button>
            )}
          </div>
        </Space>
      }
    />
  );

  // 无数据引导
  const renderNoDataGuide = () => (
    <Result
      status="info"
      title="暂无数据"
      subTitle={message || "数据库中可能还没有相关数据"}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Title level={4}>您可以:</Title>
            <ul>
              <li>
                <Paragraph>
                  <Text strong>尝试其他搜索词</Text> - 使用更一般或更具体的术语
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  <Text strong>检查数据库</Text> - 确认数据库中包含所需数据
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  <Text strong>联系管理员</Text> - 请求添加所需数据
                </Paragraph>
              </li>
            </ul>
          </Card>
          
          {onRetry && (
            <>
              <Divider />
              <Button type="primary" onClick={onRetry}>
                重试
              </Button>
            </>
          )}
        </Space>
      }
    />
  );

  // 搜索为空引导
  const renderSearchEmptyGuide = () => (
    <Result
      icon={<SearchOutlined style={{ color: '#1890ff' }} />}
      title="未找到搜索结果"
      subTitle={message || "尝试修改您的搜索条件"}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Title level={4}>搜索建议:</Title>
            <ul>
              <li>
                <Paragraph>
                  检查拼写是否正确
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  尝试使用更广泛的搜索词
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  使用疾病ID进行精确搜索
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  减少筛选条件
                </Paragraph>
              </li>
            </ul>
          </Card>
          
          {onRetry && (
            <>
              <Divider />
              <Button type="primary" onClick={onRetry}>
                清除搜索
              </Button>
            </>
          )}
        </Space>
      }
    />
  );

  // 根据类型渲染不同的引导
  switch (type) {
    case 'api-error':
      return renderApiErrorGuide();
    case 'no-data':
      return renderNoDataGuide();
    case 'search-empty':
      return renderSearchEmptyGuide();
    default:
      return renderApiErrorGuide();
  }
};

export default EmptyStateGuide; 