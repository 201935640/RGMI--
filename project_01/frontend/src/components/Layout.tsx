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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-blue-100 to-sky-100 relative overflow-x-hidden text-slate-900">
      {/* Background decoration elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-200/40 blur-[180px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-200/30 blur-[120px] -z-10 rounded-full" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-tech-grid opacity-40 -z-10 pointer-events-none" />

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-300">
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 px-4 border-t border-blue-900/10 bg-blue-900/[0.03] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 space-y-6 md:space-y-0">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded flex items-center justify-center shadow-md">
                <span className="text-white font-black text-xs">RG</span>
             </div>
            <span className="text-blue-700 font-bold tracking-tight">疾视 V2.0 <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-1">PLATFORM</span></span>
          </div>
          <div className="flex space-x-8 font-medium">
            <span className="hover:text-blue-600 transition-all cursor-pointer">隐私政策</span>
            <span className="hover:text-blue-600 transition-all cursor-pointer">服务条款</span>
            <span className="hover:text-blue-600 transition-all cursor-pointer">联系专家</span>
          </div>
          <div className="text-slate-400 font-normal">
            © 2026 RGMI 生态系统 · 基于深度学习技术
          </div>
        </div>
      </footer>

      {/* Global Components */}
      <GlobalLoading isLoading={isLoading} tip={loadingTip} />
    </div>
  );
};

export default Layout;
