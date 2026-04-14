import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import GlobalLoading from './GlobalLoading';
import { useUIStore } from '../store/uiStore';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading, loadingTip } = useUIStore();

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-x-hidden text-gray-800">
      {/* Background decoration elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 blur-[150px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 blur-[100px] -z-10 rounded-full" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-tech-grid opacity-40 -z-10 pointer-events-none" />

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-300">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 text-center border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-tech-blue font-bold italic tracking-wider">RGMI</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 font-medium">疾视 V2.0 疾病相似性可视化系统</span>
          </div>
          <div className="flex space-x-6">
            <span className="hover:text-tech-blue transition-colors cursor-pointer">隐私政策</span>
            <span className="hover:text-tech-blue transition-colors cursor-pointer">服务条款</span>
            <span className="hover:text-tech-blue transition-colors cursor-pointer">技术支持</span>
          </div>
          <div className="text-gray-400">
            © 2026 RGMI Team. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Global Components */}
      <GlobalLoading isLoading={isLoading} tip={loadingTip} />
    </div>
  );
};

export default Layout;
