import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Popconfirm, 
  message,
  Typography,
  Tag,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  LockOutlined, 
  UnlockOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * 用户管理组件 - 仅管理员可见
 * User Administration Component - Admin only
 */
const UserAdmin = ({ language = 'zh' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // 文本翻译函数
  const t = (zh, en) => {
    return language === 'zh' ? zh : en;
  };

  // 模拟从API加载用户数据
  useEffect(() => {
    // 模拟API延迟
    setTimeout(() => {
      // 示例用户数据
      const mockUsers = [
        { 
          id: 'admin1', 
          username: 'admin', 
          name: t('管理员', 'Administrator'),
          role: 'admin', 
          status: 'active', 
          lastLogin: '2023-04-05 10:30:22' 
        },
        { 
          id: 'user1', 
          username: 'user1', 
          name: t('用户一', 'User One'),
          role: 'user', 
          status: 'active', 
          lastLogin: '2023-04-05 09:15:42' 
        },
        { 
          id: 'user2', 
          username: 'user2', 
          name: t('用户二', 'User Two'),
          role: 'user', 
          status: 'active', 
          lastLogin: '2023-04-04 16:20:03' 
        },
        { 
          id: 'user3', 
          username: 'user3', 
          name: t('用户三', 'User Three'),
          role: 'user', 
          status: 'inactive', 
          lastLogin: '2023-03-28 11:05:39' 
        }
      ];
      
      setUsers(mockUsers);
      setLoading(false);
    }, 800);
  }, [language]);

  // 打开新建用户模态框
  const showAddModal = () => {
    setModalTitle(t('添加新用户', 'Add New User'));
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑用户模态框
  const showEditModal = (user) => {
    setModalTitle(t('编辑用户', 'Edit User'));
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      role: user.role,
      status: user.status,
    });
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新现有用户
        const updatedUsers = users.map(user => 
          user.id === editingUser.id ? { ...user, ...values } : user
        );
        setUsers(updatedUsers);
        message.success(t('用户已更新', 'User updated successfully'));
      } else {
        // 创建新用户
        const newUser = {
          id: `user${Date.now()}`,
          username: values.username,
          name: values.name,
          role: values.role,
          status: values.status,
          lastLogin: '-'
        };
        setUsers([...users, newUser]);
        message.success(t('用户已创建', 'User created successfully'));
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // 删除用户
  const handleDelete = (userId) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    message.success(t('用户已删除', 'User deleted successfully'));
  };

  // 切换用户状态
  const toggleUserStatus = (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, status: newStatus } : u
    );
    setUsers(updatedUsers);
    
    message.success(
      newStatus === 'active' 
        ? t('用户已激活', 'User activated successfully')
        : t('用户已停用', 'User deactivated successfully')
    );
  };

  // 表格列定义
  const columns = [
    {
      title: t('用户名', 'Username'),
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space>
          {text}
          {record.role === 'admin' && (
            <Tag color="gold">{t('管理员', 'Admin')}</Tag>
          )}
        </Space>
      )
    },
    {
      title: t('名称', 'Name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('角色', 'Role'),
      dataIndex: 'role',
      key: 'role',
      render: (text) => (
        text === 'admin' 
          ? <Tag color="orange">{t('管理员', 'Administrator')}</Tag> 
          : <Tag color="blue">{t('普通用户', 'Regular User')}</Tag>
      )
    },
    {
      title: t('状态', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        text === 'active' 
          ? <Tag color="success">{t('已启用', 'Active')}</Tag> 
          : <Tag color="error">{t('已停用', 'Inactive')}</Tag>
      )
    },
    {
      title: t('最近登录', 'Last Login'),
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: t('操作', 'Actions'),
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => showEditModal(record)}
          >
            {t('编辑', 'Edit')}
          </Button>
          
          <Button
            type={record.status === 'active' ? 'default' : 'dashed'}
            icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
            size="small"
            onClick={() => toggleUserStatus(record)}
          >
            {record.status === 'active' 
              ? t('停用', 'Deactivate') 
              : t('启用', 'Activate')}
          </Button>
          
          {record.role !== 'admin' && (
            <Popconfirm
              title={t('确定要删除这个用户吗？', 'Are you sure you want to delete this user?')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('是', 'Yes')}
              cancelText={t('否', 'No')}
            >
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              >
                {t('删除', 'Delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="user-admin-container">
      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>{t('用户管理', 'User Management')}</span>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAddModal}
          >
            {t('添加用户', 'Add User')}
          </Button>
        }
      >
        <Table 
          dataSource={users} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => t(
              `共 ${total} 个用户`,
              `Total ${total} users`
            )
          }}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        okText={t('保存', 'Save')}
        cancelText={t('取消', 'Cancel')}
      >
        <Form
          form={form}
          layout="vertical"
          name="user_form"
        >
          <Form.Item
            name="username"
            label={t('用户名', 'Username')}
            rules={[
              { 
                required: true, 
                message: t(
                  '请输入用户名',
                  'Please input the username'
                ) 
              }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('用户名', 'Username')} />
          </Form.Item>
          
          <Form.Item
            name="name"
            label={t('名称', 'Name')}
            rules={[
              { 
                required: true, 
                message: t(
                  '请输入用户名称',
                  'Please input the name'
                ) 
              }
            ]}
          >
            <Input placeholder={t('名称', 'Name')} />
          </Form.Item>
          
          <Form.Item
            name="role"
            label={t('角色', 'Role')}
            rules={[
              { 
                required: true, 
                message: t(
                  '请选择角色',
                  'Please select a role'
                ) 
              }
            ]}
          >
            <Select placeholder={t('选择角色', 'Select role')}>
              <Option value="admin">{t('管理员', 'Administrator')}</Option>
              <Option value="user">{t('普通用户', 'Regular User')}</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label={t('状态', 'Status')}
            rules={[
              { 
                required: true, 
                message: t(
                  '请选择状态',
                  'Please select a status'
                ) 
              }
            ]}
          >
            <Select placeholder={t('选择状态', 'Select status')}>
              <Option value="active">{t('启用', 'Active')}</Option>
              <Option value="inactive">{t('停用', 'Inactive')}</Option>
            </Select>
          </Form.Item>
          
          {!editingUser && (
            <>
              <Divider />
              <Text type="secondary">
                {t(
                  '注意：实际系统中，这里应该有设置密码和其它安全选项。',
                  'Note: In a real system, there would be password and other security options here.'
                )}
              </Text>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default UserAdmin; 