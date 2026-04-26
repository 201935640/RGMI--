import React, { useState } from 'react';
import { Form, Input, Button, Card, Radio, Alert, Typography, notification, Space, Divider } from 'antd';
import {
  UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined,
  SafetyOutlined, NodeIndexOutlined, PartitionOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './Login.css';

const { Title, Text } = Typography;

/**
 * 登录组件 - 全新分屏生物科技主题
 */
const Login = ({ onLogin, onSwitchToRegister }) => {
  const [form] = Form.useForm();
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const userTypeOptions = [
    { label: t('regularUser'), value: 'user' },
    { label: t('administrator'), value: 'admin' }
  ];

  const validateUser = (values) => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      if (userType === 'admin') {
        if (values.username === 'admin' && values.password === 'admin123') {
          handleSuccessfulLogin({ id: 'admin1', username: values.username, role: 'admin', name: t('administrator') });
        } else {
          setError('管理员用户名或密码不正确');
          setLoading(false);
        }
      } else {
        const registeredUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const registeredUser = registeredUsers.find(u => u.username === values.username && u.password === values.password);
        if (registeredUser) {
          registeredUser.lastLogin = new Date().toISOString();
          localStorage.setItem('users', JSON.stringify(registeredUsers));
          handleSuccessfulLogin({ id: registeredUser.id, username: registeredUser.username, role: registeredUser.role, name: registeredUser.name || registeredUser.username });
          return;
        }
        const validUsers = [
          { username: 'user1', password: 'user123', name: '用户一' },
          { username: 'user2', password: 'user123', name: '用户二' }
        ];
        const user = validUsers.find(u => u.username === values.username && u.password === values.password);
        if (user) {
          handleSuccessfulLogin({ id: user.username, username: user.username, role: 'user', name: user.name });
        } else {
          setError('用户名或密码不正确');
          setLoading(false);
        }
      }
    }, 1000);
  };

  const handleSuccessfulLogin = (user) => {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    notification.success({
      message: t('loginSuccess'),
      description: t('welcomeBack').replace('{name}', user.name),
      placement: 'topRight'
    });
    setLoading(false);
    if (onLogin) onLogin(user);
  };

  const handleUserTypeChange = (e) => {
    setUserType(e.target.value);
    form.resetFields(['username', 'password']);
    setError(null);
  };

  // 左侧展示内容
  const highlights = [
    { icon: <DatabaseOutlined />, text: '30,170 种疾病表型数据' },
    { icon: <NodeIndexOutlined />, text: '17,247 个基因实体' },
    { icon: <PartitionOutlined />, text: '4,797 条 miRNA 分子' },
    { icon: <SafetyOutlined />, text: '安全可靠的数据分析' },
  ];

  return (
    <div className="login-container" style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: '#F0FDF4' }}>

      {/* ===== 左侧装饰面板 ===== */}
      <div style={{
        width: '45%',
        minWidth: 360,
        background: 'linear-gradient(160deg, #1E3A8A 0%, #1E40AF 45%, #2563EB 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 56px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
        className="login-left-panel"
      >
        {/* 网格背景 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />

        {/* 右侧光晕 */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
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
                <sup style={{ fontSize: 9, background: 'linear-gradient(135deg, #D4AF37, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, position: 'relative', top: -10, marginLeft: 3, letterSpacing: 0.5 }}>BETA</sup>
              </div>
              <div style={{ color: 'rgba(191,219,254,0.5)', fontSize: 12, letterSpacing: 1 }}>RGMI Disease Platform</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#EFF6FF', lineHeight: 1.3, marginBottom: 16 }}>
            探索疾病<br />
            <span style={{ background: 'linear-gradient(135deg, #93C5FD, #FDE68A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              基因关联网络
            </span>
          </h2>

          <p style={{ color: 'rgba(191,219,254,0.6)', fontSize: 14, lineHeight: 1.8, marginBottom: 48, maxWidth: 340 }}>
            基于深度学习的疾病-基因-miRNA 多维关联分析平台，助力生物医学研究与临床应用。
          </p>

          {/* 亮点列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {highlights.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: 12,
                backdropFilter: 'blur(6px)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
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

      {/* ===== 右侧登录表单 ===== */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          {/* 表单头 */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E40AF', margin: '0 0 8px' }}>
              欢迎回来
            </h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
              {t('loginSubtitle')}
            </p>
          </div>

          {/* 用户类型切换 */}
          <div style={{ marginBottom: 24 }}>
            <Radio.Group
              options={userTypeOptions}
              onChange={handleUserTypeChange}
              value={userType}
              optionType="button"
              buttonStyle="solid"
              style={{ width: '100%' }}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert
              message={t('loginError')}
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 20, borderRadius: 10 }}
            />
          )}

          {/* 表单 */}
          <Form form={form} name="login_form" onFinish={validateUser} layout="vertical" requiredMark={false}>
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入您的用户名' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#2563EB' }} />}
                placeholder={userType === 'admin' ? t('adminUsername') : t('username')}
                size="large"
                autoComplete="username"
                style={{ borderRadius: 10, height: 48, border: '1.5px solid rgba(37,99,235,0.3)', background: 'white' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入您的密码' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#2563EB' }} />}
                placeholder={t('password')}
                size="large"
                autoComplete="current-password"
                style={{ borderRadius: 10, height: 48, border: '1.5px solid rgba(37,99,235,0.3)', background: 'white' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<LoginOutlined />}
                style={{
                  height: 50, borderRadius: 12, fontSize: 16, fontWeight: 700,
                  background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(13,94,63,0.4)',
                  letterSpacing: 0.5,
                }}
              >
                {t('login')}
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="default"
                block
                onClick={onSwitchToRegister}
                icon={<UserAddOutlined />}
                style={{
                  height: 46, borderRadius: 12, fontWeight: 600,
                  border: '1.5px solid rgba(37,99,235,0.3)',
                  color: '#1E40AF',
                  background: 'transparent',
                }}
              >
                注册新账号
              </Button>
            </Form.Item>
          </Form>

          {/* 示例账号 */}
          {(userType === 'user' || userType === 'admin') && (
            <div style={{
              marginTop: 28,
              padding: '16px 20px',
              background: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.15)',
              borderRadius: 12,
            }}>
              <Text style={{ display: 'block', marginBottom: 10, color: '#475569', fontSize: 13, fontWeight: 600 }}>
                {userType === 'admin' ? t('adminAccount') : t('demoAccounts')}
              </Text>
              {userType === 'user' ? (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text code style={{ borderRadius: 6, fontSize: 13 }}>user1/ user123</Text>
                  <Text code style={{ borderRadius: 6, fontSize: 13 }}>user2/ user123</Text>
                </Space>
              ) : (
                <Text code style={{ borderRadius: 6, fontSize: 13 }}>admin/ admin123</Text>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
