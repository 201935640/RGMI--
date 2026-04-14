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
          lastLogin: '2023-10-15 14:30:45'
        },
        {
          id: '2',
          username: 'user1',
          name: '测试用户1',
          email: 'user1@example.com',
          role: 'user',
          status: 'active',
          lastLogin: '2023-10-14 09:15:22'
        },
        {
          id: '3',
          username: 'researcher',
          name: '研究员',
          email: 'researcher@example.com',
          role: 'researcher',
          status: 'active',
          lastLogin: '2023-10-13 16:45:10'
        },
        {
          id: '4',
          username: 'guest',
          name: '访客用户',
          email: 'guest@example.com',
          role: 'guest',
          status: 'inactive',
          lastLogin: '2023-09-30 11:20:35'
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
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'blue';
        let roleText = '用户';
        
        if (role === 'admin') {
          color = 'red';
          roleText = '管理员';
        } else if (role === 'researcher') {
          color = 'green';
          roleText = '研究员';
        } else if (role === 'guest') {
          color = 'gray';
          roleText = '访客';
        }
        
        return <Tag color={color}>{roleText}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'active' ? 'green' : 'volcano';
        const text = status === 'active' ? '活跃' : '禁用';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              删除
            </Button>
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
    message.success('用户已删除');
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
        message.success('用户已更新');
      } else {
        // 添加新用户
        const newUser = {
          id: Date.now().toString(), // 生成临时ID
          ...values,
          lastLogin: '-'
        };
        setUsers([...users, newUser]);
        message.success('用户已添加');
      }
      
      setShowModal(false);
    });
  };
  
  return (
    <div className="user-admin-container">
      <Card 
        title={
          <Title level={4}>用户管理</Title>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加用户
          </Button>
        }
      >
        <Alert
          message="模拟数据"
          description="当前展示的是模拟数据，实际应用中会从后端API获取真实用户数据。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条数据`
          }}
        />
      </Card>
      
      {/* 添加/编辑用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={showModal}
        onOk={handleSubmit}
        onCancel={() => setShowModal(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
            status: 'active'
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: !editingUser, message: '请输入密码' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="姓名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="邮箱" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              <Option value="admin">管理员</Option>
              <Option value="researcher">研究员</Option>
              <Option value="user">普通用户</Option>
              <Option value="guest">访客</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="active">活跃</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserAdmin; 