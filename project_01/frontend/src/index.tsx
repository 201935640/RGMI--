import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ApiStatusProvider } from './contexts/ApiStatusContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ApiStatusProvider>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </ApiStatusProvider>
    </BrowserRouter>
  </React.StrictMode>
); 

// 如果你想开始测量应用的性能，请取消注释下面的代码
// reportWebVitals(console.log);
// 或者传递给自定义分析服务
reportWebVitals(); 