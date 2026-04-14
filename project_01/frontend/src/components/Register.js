import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, notification, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './Login.css'; // 复用Login的样式

const { Title, Text } = Typography;

/**
 * 注册组件 - 提供用户注册功能
 * Register Component - Provides user registration functionality
 */
const Register = ({ onRegister, onBackToLogin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  // 在实际应用中，这里应该是一个API调用来注册用户
  // In a real application, this would be an API call to register the user
  const handleRegister = (values) => {
    setLoading(true);
    setError(null);

    // 确认两次密码输入是否一致
    if (values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    // 模拟API调用的延迟
    setTimeout(() => {
      // 检查用户名是否已存在
      // 这里模拟检查，实际应用中应该调用后端API
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const userExists = existingUsers.some(user => user.username === values.username);

      if (userExists) {
        setError('用户名已存在，请选择其他用户名');
        setLoading(false);
        return;
      }

      // 创建新用户
      const newUser = {
        id: Date.now().toString(),
        username: values.username,
        name: values.username,
        email: values.email,
        password: values.password, // 实际应用中应加密存储
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      // 保存用户（模拟）
      existingUsers.push(newUser);
      localStorage.setItem('users', JSON.stringify(existingUsers));

      // 注册成功通知
      notification.success({
        message: '注册成功',
        description: '您的账号已创建成功，现在可以登录系统',
        placement: 'topRight'
      });

      setLoading(false);

      // 回调通知父组件
      if (onRegister) {
        onRegister(newUser);
      }
    }, 1000);
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
          <Text className="login-subtitle">注册新账号</Text>
        </div>

        {error && (
          <Alert
            message="注册错误"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          name="register_form"
          onFinish={handleRegister}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="用户名"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入电子邮箱' },
              { type: 'email', message: '请输入有效的电子邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" />}
              placeholder="电子邮箱"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="确认密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={<UserAddOutlined />}
            >
              注册
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="link"
              block
              onClick={onBackToLogin}
              icon={<ArrowLeftOutlined />}
            >
              返回登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register; 