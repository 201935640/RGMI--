import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  SearchOutlined, 
  ExperimentOutlined, 
  NodeIndexOutlined, 
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  BulbOutlined,
  HistoryOutlined
} from '@ant-design/icons';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: '搜索', icon: <SearchOutlined />, path: '/search' },
    { label: 'GGI 预测', icon: <ExperimentOutlined />, path: '/predict-ggi' },
    { label: '可视化网络', icon: <NodeIndexOutlined />, path: '/network' },
    { label: '历史记录', icon: <HistoryOutlined />, path: '/history' },
    { label: '关于', icon: <BulbOutlined />, path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 h-16 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-tech-blue rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <NodeIndexOutlined className="text-white text-2xl" />
            </div>
            <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-tech-blue to-blue-400 tracking-wider">
              疾视 V2.0
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center px-4 py-2 rounded-md transition-all duration-300 ${
                  isActive(item.path)
                    ? 'bg-tech-blue/10 text-tech-blue font-bold'
                    : 'text-gray-600 hover:text-tech-blue hover:bg-tech-blue/5'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            
            <div className="h-6 w-px bg-gray-200 mx-2" />
            
            <button className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-tech-blue hover:text-white transition-all">
              <UserOutlined />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              {isMenuOpen ? <CloseOutlined className="text-2xl" /> : <MenuOutlined className="text-2xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-tech-blue-dark/95 backdrop-blur-lg border-b border-tech-blue/30">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 rounded-md transition-all ${
                  isActive(item.path)
                    ? 'bg-tech-blue text-white'
                    : 'text-gray-300 hover:text-white hover:bg-tech-blue/10'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
