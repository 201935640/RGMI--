import React from 'react';
import { Result, Button, Steps, Card, Typography, Divider, Space } from 'antd';
import { ApiOutlined, DatabaseOutlined, SettingOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // API错误引导
  const renderApiErrorGuide = () => (
    <Result
      status="warning"
      title={t('API服务不可用', 'API Service Unavailable')}
      subTitle={message || t('无法连接到API服务器，这可能是由于以下原因', 'Could not connect to the API server. This might be due to the following reasons:')}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Steps direction="vertical" current={-1}>
              <Step 
                title={t('检查API服务器', 'Check API Server')} 
                description={t('确保API服务器正在运行并且可以访问', 'Make sure the API server is running and accessible')}
                icon={<ApiOutlined />}
              />
              <Step 
                title={t('检查网络连接', 'Check Network Connection')} 
                description={t('确保您的网络连接正常', 'Ensure your network connection is working properly')}
                icon={<SettingOutlined />}
              />
              <Step 
                title={t('联系管理员', 'Contact Administrator')} 
                description={t('如果问题持续存在，请联系系统管理员', 'If the issue persists, please contact the system administrator')}
                icon={<QuestionCircleOutlined />}
              />
            </Steps>
          </Card>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" onClick={onRetry || (() => window.location.reload())}>
              {t('重试连接', 'Retry Connection')}
            </Button>
            
            {message && message.includes('示例数据') && (
              <Button type="default" onClick={onRetry}>
                {t('使用示例数据', 'Use Sample Data')}
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
      title={t('暂无数据', 'No Data Available')}
      subTitle={message || t('数据库中可能还没有相关数据', 'There might not be any relevant data in the database yet')}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Title level={4}>{t('您可以', 'You can')}:</Title>
            <ul>
              <li>
                <Paragraph>
                  <Text strong>{t('尝试其他搜索词', 'Try different search terms')}</Text> - {t('使用更一般或更具体的术语', 'Use more general or more specific terms')}
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  <Text strong>{t('检查数据库', 'Check the database')}</Text> - {t('确认数据库中包含所需数据', 'Verify that the database contains the required data')}
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  <Text strong>{t('联系管理员', 'Contact the administrator')}</Text> - {t('请求添加所需数据', 'Request for the required data to be added')}
                </Paragraph>
              </li>
            </ul>
          </Card>
          
          {onRetry && (
            <>
              <Divider />
              <Button type="primary" onClick={onRetry}>
                {t('重试', 'Retry')}
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
      title={t('未找到搜索结果', 'No Search Results Found')}
      subTitle={message || t('尝试修改您的搜索条件', 'Try modifying your search criteria')}
      extra={
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Title level={4}>{t('搜索建议', 'Search Suggestions')}:</Title>
            <ul>
              <li>
                <Paragraph>
                  {t('检查拼写是否正确', 'Check if your spelling is correct')}
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  {t('尝试使用更广泛的搜索词', 'Try using more general search terms')}
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  {t('使用疾病ID进行精确搜索', 'Use disease IDs for precise searching')}
                </Paragraph>
              </li>
              <li>
                <Paragraph>
                  {t('减少筛选条件', 'Reduce filtering criteria')}
                </Paragraph>
              </li>
            </ul>
          </Card>
          
          {onRetry && (
            <>
              <Divider />
              <Button type="primary" onClick={onRetry}>
                {t('清除搜索', 'Clear Search')}
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