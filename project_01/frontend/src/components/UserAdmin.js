import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Popconfirm, 
  message, 
  Tag, 
  Typography,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  LockOutlined 
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

/**
 * UserAdmin组件 - 管理员用户管理界面
 */
const UserAdmin = () => {
  // 状态变量
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState(null);

  // 初始化加载用户数据
  useEffect(() => {
    // 模拟从API获取用户数据
    const fetchUsers = () => {
      setLoading(true);

      // 模拟数据
      const mockUsers = [
        {
          id: '1',
          username: 'admin',
          name: '管理员',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          lastLogin: '2026-04-10 14:30:45'
        },
        {
          id: '2',
          username: 'researcher_lxy',
          name: 'LXY',
          email: 'lxy@rgmi.bio',
          role: 'researcher',
          status: 'active',
          lastLogin: '2026-04-14 09:15:22'
        },
        {
          id: '3',
          username: 'researcher_01',
          name: '张教授',
          email: 'zhang@university.edu',
          role: 'researcher',
          status: 'active',
          lastLogin: '2026-04-13 16:45:10'
        },
        {
          id: '4',
          username: 'intern_v',
          name: '实习生王',
          email: 'wang@rgmi.bio',
          role: 'guest',
          status: 'active',
          lastLogin: '2026-04-12 11:20:35'
        }
      ];

      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 500);
    };

    fetchUsers();
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_, record) => (
        <Space size="middle">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
            <UserOutlined />
          </div>
          <div>
            <div className="font-bold text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-500">@{record.username}</div>
          </div>
        </Space>
      )
    },
    {
      title: '联系邮箱',
      dataIndex: 'email',
      key: 'email',
      className: 'text-slate-600 font-medium'
    },
    {
      title: '系统角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let config = { color: 'emerald', text: '用户' };

        if (role === 'admin') {
          config = { color: 'red', text: '管理员' };
        } else if (role === 'researcher') {
          config = { color: 'blue', text: '研究员' };
        } else if (role === 'guest') {
          config = { color: 'slate', text: '访客' };
        }

        const colors = {
          emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          red: 'bg-rose-100 text-rose-700 border-rose-200',
          blue: 'bg-indigo-100 text-indigo-700 border-indigo-200',
          slate: 'bg-slate-100 text-slate-600 border-slate-200'
        };

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors[config.color]}`}>
            {config.text}
          </span>
        );
      }
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const isActive = status === 'active';
        return (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className={`text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
              {isActive ? '活跃' : '已禁用'}
            </span>
          </div>
        );
      }
    },
    {
      title: '最近登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      className: 'text-slate-500 text-xs font-mono'
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认移除用户？"
            description="移除后该用户将无法访问平台。"
            onConfirm={() => handleDelete(record.id)}
            okText="移除"
            cancelText="取消"
            okButtonProps={{ danger: true, className: 'rounded-md' }}
            cancelButtonProps={{ className: 'rounded-md' }}
          >
            <Button
              type="text"
              danger
              className="hover:bg-rose-50"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 处理添加用户
  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setShowModal(true);
  };

  // 处理编辑用户
  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '' // 编辑时不显示密码
    });
    setShowModal(true);
  };

  // 处理删除用户
  const handleDelete = (userId) => {
    // 在实际应用中，这里应该调用API删除用户
    setUsers(users.filter(user => user.id !== userId));
    message.success('用户权限已收回');
  };

  // 处理表单提交
  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingUser) {
        // 更新现有用户
        const updatedUsers = users.map(user => {
          if (user.id === editingUser.id) {
            return { ...user, ...values };
          }
          return user;
        });
        setUsers(updatedUsers);
        message.success('用户信息更新成功');
      } else {
        // 添加新用户
        const newUser = {
          id: Date.now().toString(), // 生成临时ID
          ...values,
          lastLogin: '刚刚'
        };
        setUsers([...users, newUser]);
        message.success('新用户已加入系统');
      }

      setShowModal(false);
    });
  };

  return (
    <div className="user-admin-container animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card
        variant="borderless"
        className="bg-white/70 backdrop-blur-md shadow-xl shadow-emerald-900/5 rounded-2xl overflow-hidden border border-emerald-100"
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
              <TeamOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0D5E3F', letterSpacing: '-0.025em' }}>权限管理控制台</Title>
              <div className="text-xs text-emerald-600/60 font-medium tracking-wider uppercase">User Access Control System</div>
            </div>
          </div>
        }
        extra={
          <Button
            type="primary"
            size="large"
            className="bg-primary hover:bg-primary-light border-none rounded-xl shadow-lg shadow-emerald-900/20 font-bold flex items-center transition-all hover:scale-105 active:scale-95"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增研究员
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start space-x-4">
          <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-sm">
            <InfoCircleOutlined className="text-lg" />
          </div>
          <div>
            <div className="font-bold text-emerald-900">系统提示</div>
            <div className="text-sm text-emerald-700/80 leading-relaxed">
              您正在以<span className="font-bold underline">超级管理员</span>身份访问。当前管理的账户均属于 <span className="italic font-medium">RGMI 生态系统</span> 授权实验室。
            </div>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          className="custom-table"
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => <span className="text-slate-400 text-xs">共计 {total} 位授权用户</span>,
            className: 'custom-pagination'
          }}
        />
      </Card>

      {/* 添加/编辑用户模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-4">
             <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
               {editingUser ? <EditOutlined /> : <PlusOutlined />}
             </div>
             <span className="font-black text-slate-800">{editingUser ? '完善账户信息' : '创建新访问权限'}</span>
          </div>
        }
        open={showModal}
        onOk={handleSubmit}
        onCancel={() => setShowModal(false)}
        okText={editingUser ? "保存更改" : "确认授权"}
        cancelText="取消"
        okButtonProps={{
          className: 'bg-primary hover:bg-primary-light border-none rounded-lg h-10 px-6 font-bold shadow-lg shadow-emerald-900/10'
        }}
        cancelButtonProps={{
          className: 'rounded-lg h-10 border-slate-200 text-slate-500'
        }}
        centered
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          initialValues={{
            role: 'user',
            status: 'active'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">系统工号 / ID</span>}
                rules={[{ required: true, message: '请输入工号' }]}
              >
                <Input prefix={<UserOutlined className="text-slate-300" />} className="h-10 rounded-lg border-slate-200" placeholder="e.g. res_001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">真实姓名</span>}
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input className="h-10 rounded-lg border-slate-200" placeholder="姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">电子邮箱</span>}
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' }
            ]}
          >
            <Input className="h-10 rounded-lg border-slate-200" placeholder="researcher@rgmi.bio" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">初始访问密码</span>}
              rules={[{ required: !editingUser, message: '请设置初始密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-300" />}
                className="h-10 rounded-lg border-slate-200"
                placeholder="密码安全性要求：8位以上"
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">角色级别</span>}
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select className="custom-select" placeholder="选择角色">
                  <Option value="admin">系统管理员</Option>
                  <Option value="researcher">高级研究员</Option>
                  <Option value="user">数据分析师</Option>
                  <Option value="guest">临时访客</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={<span className="text-xs font-black uppercase tracking-wider text-slate-400">访问状态</span>}
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select className="custom-select" placeholder="选择状态">
                  <Option value="active">授权通过</Option>
                  <Option value="inactive">权限冻结</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <style jsx="true">{`
        .custom-table .ant-table {
          background: transparent;
        }
        .custom-table .ant-table-thead > tr > th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #f1f5f9;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9;
          padding: 16px;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(16, 185, 129, 0.03) !important;
        }
        .custom-select .ant-select-selector {
          height: 40px !important;
          border-radius: 8px !important;
          display: flex;
          align-items: center;
        }
        .custom-pagination .ant-pagination-item-active {
          border-color: #0D5E3F;
          background: #0D5E3F;
        }
        .custom-pagination .ant-pagination-item-active a {
          color: white;
        }
      `}</style>
    </div>
  );
};

export default UserAdmin; 