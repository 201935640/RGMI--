import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface GlobalLoadingProps {
  isLoading: boolean;
  tip?: string;
}

const GlobalLoading: React.FC<GlobalLoadingProps> = ({ isLoading, tip = '正在处理计算任务...' }) => {
  if (!isLoading) return null;

  const antIcon = <LoadingOutlined style={{ fontSize: 48, color: '#0066FF' }} spin />;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="tech-card p-10 flex flex-col items-center bg-white border border-blue-100 shadow-2xl">
        <Spin indicator={antIcon} />
        <div className="mt-6 text-xl font-bold text-tech-blue animate-pulse">
          {tip}
        </div>
        <div className="mt-2 text-sm text-gray-500">
          系统正在进行深度学习推理，请稍候...
        </div>
      </div>
    </div>
  );
};

export default GlobalLoading;
