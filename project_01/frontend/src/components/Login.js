import React, { useState } from 'react';
import { Form, Input, Button, Card, Radio, Alert, Typography, notification, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './Login.css';

const { Title, Text } = Typography;

/**
 * 登录组件 - 提供用户登录功能
 * Login Component - Provides user login functionality
 */
const Login = ({ onLogin, onSwitchToRegister }) => {
  const [form] = Form.useForm();
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  // 用户类型选项
  const userTypeOptions = [
    { label: t('regularUser'), value: 'user' },
    { label: t('administrator'), value: 'admin' }
  ];

  // 在实际应用中，这里应该是一个API调用来验证用户
  // In a real application, this would be an API call to validate the user
  const validateUser = (values) => {
    setLoading(true);
    setError(null);

    // 模拟API调用的延迟
    setTimeout(() => {
      // 管理员验证逻辑
      if (userType === 'admin') {
        if (values.username === 'admin' && values.password === 'admin123') {
          handleSuccessfulLogin({
            id: 'admin1',
            username: values.username,
            role: 'admin',
            name: t('administrator')
          });
        } else {
          setError(t('管理员用户名或密码不正确', 'Administrator username or password is incorrect'));
          setLoading(false);
        }
      } 
      // 普通用户验证逻辑
      else {
        // 首先检查localStorage中存储的用户
        const registeredUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const registeredUser = registeredUsers.find(u => 
          u.username === values.username && u.password === values.password
        );
        
        if (registeredUser) {
          // 更新最后登录时间
          registeredUser.lastLogin = new Date().toISOString();
          localStorage.setItem('users', JSON.stringify(registeredUsers));
          
          handleSuccessfulLogin({
            id: registeredUser.id,
            username: registeredUser.username,
            role: registeredUser.role,
            name: registeredUser.name || registeredUser.username
          });
          return;
        }
        
        // 示例普通用户账号（后备方案）
        const validUsers = [
          { username: 'user1', password: 'user123', name: t('用户一', 'User One') },
          { username: 'user2', password: 'user123', name: t('用户二', 'User Two') }
        ];

        const user = validUsers.find(u => 
          u.username === values.username && u.password === values.password
        );

        if (user) {
          handleSuccessfulLogin({
            id: user.username,
            username: user.username,
            role: 'user',
            name: user.name
          });
        } else {
          setError(t('用户名或密码不正确', 'Username or password is incorrect'));
          setLoading(false);
        }
      }
    }, 1000);
  };

  // 处理成功登录
  const handleSuccessfulLogin = (user) => {
    // 假设保存到sessionStorage以便在刷新后仍然保持登录状态
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    
    notification.success({
      message: t('loginSuccess'),
      description: t('welcomeBack').replace('{name}', user.name),
      placement: 'topRight'
    });
    
    setLoading(false);
    
    // 将用户信息传递给父组件
    if (onLogin) {
      onLogin(user);
    }
  };

  // 切换用户类型
  const handleUserTypeChange = (e) => {
    setUserType(e.target.value);
    form.resetFields(['username', 'password']);
    setError(null);
  };

  // 装饰性圆圈元素
  const DecorativeCircle = ({ style }) => (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        background: 'rgba(92, 107, 192, 0.05)',
        ...style,
      }}
    />
  );

  return (
    <div className="login-container">
      {/* 装饰性背景元素 */}
      <DecorativeCircle style={{ width: '300px', height: '300px', top: '-150px', left: '-150px' }} />
      <DecorativeCircle style={{ width: '400px', height: '400px', bottom: '-200px', right: '-200px' }} />
      <DecorativeCircle style={{ width: '200px', height: '200px', top: '20%', right: '10%' }} />
      <DecorativeCircle style={{ width: '150px', height: '150px', bottom: '15%', left: '10%' }} />
      
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#26d0ce"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#26d0ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <Title level={3} className="login-title">
              疾视
              <sup className="beta-tag">BETA</sup>
              平台
          </Title>
          </div>
          <Text className="login-subtitle">{t('loginSubtitle')}</Text>
        </div>

        {error && (
          <Alert
            message={t('loginError')}
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          name="login_form"
          onFinish={validateUser}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item>
            <Radio.Group
              options={userTypeOptions}
              onChange={handleUserTypeChange}
              value={userType}
              optionType="button"
              buttonStyle="solid"
              style={{ width: '100%', marginBottom: 16 }}
            />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[{ 
              required: true, 
              message: t('请输入您的用户名', 'Please input your username') 
            }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder={userType === 'admin' 
                ? t('adminUsername') 
                : t('username')}
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ 
              required: true, 
              message: t('请输入您的密码', 'Please input your password') 
            }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('password')}
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<LoginOutlined />}
            >
              {t('login')}
            </Button>
          </Form.Item>
          
          <Form.Item>
            <Button
              type="default"
              block
              onClick={onSwitchToRegister}
              icon={<UserAddOutlined />}
            >
              注册新账号
            </Button>
          </Form.Item>
        </Form>

        {userType === 'user' && (
        <div className="demo-accounts">
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {t('demoAccounts')}
            </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
              <Text code>
                user1 / user123
              </Text>
              <Text code>
                user2 / user123
              </Text>
          </Space>
        </div>
        )}

        {userType === 'admin' && (
          <div className="demo-accounts">
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {t('adminAccount')}
            </Text>
            <Text code>
              admin / admin123
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login; 