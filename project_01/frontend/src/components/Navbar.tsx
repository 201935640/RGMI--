import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Menu } from 'antd';
import {
  SearchOutlined,
  ExperimentOutlined,
  NodeIndexOutlined,
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  BulbOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  LogoutOutlined
} from '@ant-design/icons';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: '工作台', icon: <AppstoreOutlined />, path: '/' },
    { label: '疾病查询', icon: <SearchOutlined />, path: '/search' },
    { label: '疾病相似性网络', icon: <NodeIndexOutlined />, path: '/network' },
    { label: '历史记录', icon: <HistoryOutlined />, path: '/history' },
    { label: '关于', icon: <BulbOutlined />, path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // 退出登录
  const handleLogout = () => {
    // 清除用户信息
    sessionStorage.removeItem('currentUser');
    // 跳转到欢迎页
    navigate('/welcome');
  };

  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 backdrop-blur-md border-b border-blue-400/20 h-16 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-blue-900/50 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" opacity="0.9"/>
                  <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="ml-3 flex flex-col">
                <span className="text-xl font-black text-white tracking-tight leading-none drop-shadow-md">
                  病影药寻 <sup className="text-[10px] text-yellow-300 font-bold ml-1">BETA</sup>
                </span>
                <span className="text-[10px] text-blue-200 font-semibold tracking-widest uppercase">RGMI PLATFORM</span>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center px-4 py-2 rounded-full transition-all duration-300 relative group overflow-hidden ${
                  isActive(item.path)
                    ? 'text-white font-bold bg-blue-600/50 shadow-lg'
                    : 'text-blue-100 hover:text-white hover:bg-blue-700/40'
                }`}
              >
                <span className={`mr-2 transition-transform duration-300 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                )}
                {!isActive(item.path) && (
                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-blue-300 transition-all duration-300 group-hover:w-1/2" />
                )}
              </button>
            ))}

            <div className="h-6 w-px bg-blue-400/30 mx-4" />

            <Dropdown overlay={userMenu} placement="bottomRight" trigger={['click']}>
              <button className="w-10 h-10 rounded-full bg-blue-700/60 border border-blue-400/40 flex items-center justify-center text-white hover:bg-blue-600 hover:border-blue-300 hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer">
                <UserOutlined />
              </button>
            </Dropdown>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-blue-700/60 text-white hover:bg-blue-600 focus:outline-none transition-colors"
            >
              {isMenuOpen ? <CloseOutlined className="text-2xl" /> : <MenuOutlined className="text-2xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-900/98 backdrop-blur-xl border-b border-blue-400/20 animate-in slide-in-from-top duration-300">
          <div className="px-3 pt-2 pb-6 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-4 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-blue-600/60 text-white font-bold border-l-4 border-sky-400 shadow-lg'
                    : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                }`}
              >
                <span className="mr-4 text-xl">{item.icon}</span>
                <span className="text-base font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
