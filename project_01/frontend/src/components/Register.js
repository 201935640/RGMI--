import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, notification, Space } from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, UserAddOutlined, ArrowLeftOutlined,
  NodeIndexOutlined, PartitionOutlined, DatabaseOutlined, SafetyOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './Login.css';

const { Text } = Typography;

/**
 * 注册组件 - 全新分屏生物科技主题
 */
const Register = ({ onRegister, onBackToLogin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const handleRegister = (values) => {
    setLoading(true);
    setError(null);

    if (values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const userExists = existingUsers.some(user => user.username === values.username);
      if (userExists) {
        setError('用户名已存在，请选择其他用户名');
        setLoading(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        username: values.username,
        name: values.username,
        email: values.email,
        password: values.password,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      existingUsers.push(newUser);
      localStorage.setItem('users', JSON.stringify(existingUsers));

      notification.success({
        message: '注册成功',
        description: '您的账号已创建成功，现在可以登录系统',
        placement: 'topRight'
      });

      setLoading(false);
      if (onRegister) onRegister(newUser);
    }, 1000);
  };

  // 左侧亮点
  const highlights = [
    { icon: <DatabaseOutlined />, text: '30,170 种疾病表型数据' },
    { icon: <NodeIndexOutlined />, text: '17,247 个基因实体' },
    { icon: <PartitionOutlined />, text: '4,797 条 miRNA 分子' },
    { icon: <SafetyOutlined />, text: '安全可靠的数据分析' },
  ];

  const inputStyle = {
    borderRadius: 10, height: 48,
    border: '1.5px solid rgba(37,99,235,0.3)',
    background: 'white'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: '#F0FDF4' }}>

      {/* ===== 左侧装饰面板 ===== */}
      <div style={{
        width: '45%', minWidth: 360,
        background: 'linear-gradient(160deg, #1E3A8A 0%, #1E40AF 45%, #2563EB 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px 56px', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}
        className="login-left-panel"
      >
        {/* 网格背景 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />

        {/* 光晕 */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6" opacity="0.9"/>
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 3, background: 'linear-gradient(135deg, #EFF6FF, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                病影药寻
              </div>
              <div style={{ color: 'rgba(191,219,254,0.5)', fontSize: 12, letterSpacing: 1 }}>RGMI Disease Platform</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#EFF6FF', lineHeight: 1.3, marginBottom: 16 }}>
            加入我们<br />
            <span style={{ background: 'linear-gradient(135deg, #3B82F6, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              开启研究之旅
            </span>
          </h2>

          <p style={{ color: 'rgba(191,219,254,0.6)', fontSize: 14, lineHeight: 1.8, marginBottom: 48, maxWidth: 340 }}>
            注册账号即可访问全面的疾病-基因-miRNA 关联数据，进行深度分析与可视化探索。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {highlights.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 12, backdropFilter: 'blur(6px)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#3B82F6', fontSize: 16, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <span style={{ color: 'rgba(191,219,254,0.8)', fontSize: 14, fontWeight: 500 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 右侧注册表单 ===== */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        background: 'linear-gradient(135deg, #F0F9FF 0%, #EFF6FF 50%, #DBEAFE 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景装饰 - 光晕 */}
        <div style={{
          position: 'absolute', top: -150, right: -150,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          zIndex: 0,
        }} />

        {/* 背景网格 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0,
        }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* 返回按钮 */}
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={onBackToLogin}
            style={{ color: '#2563EB', fontWeight: 700, padding: 0, marginBottom: 24, fontSize: 14 }}
          >
            返回登录
          </Button>

          {/* 表单头 */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E40AF', margin: '0 0 8px' }}>
              创建账号
            </h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
              注册新账号，开始使用病影药寻平台
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert
              message="注册失败"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />
          )}

          {/* 表单 */}
          <Form form={form} name="register_form" onFinish={handleRegister} layout="vertical" requiredMark={false}>
            <Form.Item
              label={<span style={{ fontWeight: 600, color: '#374151' }}>用户名</span>}
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                { max: 20, message: '用户名最多20个字符' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<UserOutlined style={{ color: '#2563EB' }} />} placeholder="用户名" size="large" autoComplete="username" style={inputStyle} />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: '#374151' }}>电子邮箱</span>}
              name="email"
              rules={[
                { required: true, message: '请输入电子邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input prefix={<MailOutlined style={{ color: '#2563EB' }} />} placeholder="email@example.com" size="large" autoComplete="email" style={inputStyle} />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: '#374151' }}>密码</span>}
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#2563EB' }} />} placeholder="至少6个字符" size="large" autoComplete="new-password" style={inputStyle} />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600, color: '#374151' }}>确认密码</span>}
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#2563EB' }} />} placeholder="再次输入密码" size="large" autoComplete="new-password" style={inputStyle} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<UserAddOutlined />}
                style={{
                  height: 50, borderRadius: 12, fontSize: 16, fontWeight: 700,
                  background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(13,94,63,0.4)',
                  letterSpacing: 0.5,
                }}
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text style={{ color: '#475569', fontSize: 14 }}>已有账号？</Text>
            <Button
              type="link"
              onClick={onBackToLogin}
              style={{ color: '#2563EB', fontWeight: 700, padding: '0 6px', fontSize: 14 }}
            >
              立即登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
