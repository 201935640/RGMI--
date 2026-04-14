import React from 'react';
import { 
  Row, Col, Switch, Slider, Radio, Button, Tooltip, Divider 
} from 'antd';
import { 
  ZoomInOutlined, ZoomOutOutlined, 
  ReloadOutlined, 
  ExpandAltOutlined, ShrinkOutlined,
  InfoCircleOutlined,
  BgColorsOutlined,
  NodeIndexOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import './NetworkControls.css';

const NetworkControls = ({
  is3DView,
  setIs3DView,
  similarityThreshold,
  setSimilarityThreshold,
  colorMode,
  setColorMode,
  labelMode,
  setLabelMode,
  layoutMode,
  setLayoutMode,
  onZoomIn,
  onZoomOut,
  onReset,
  diseaseCount,
  onToggleFullscreen,
  isFullscreen
}) => {
  return (
    <div className="network-controls">
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={12} lg={8}>
          <div className="control-panel">
            <div className="panel-title">
              <BgColorsOutlined /> 颜色模式 | Color Mode
            </div>
            <Radio.Group 
              value={colorMode} 
              onChange={e => setColorMode(e.target.value)}
              buttonStyle="solid"
              size="small"
              className="full-width-group"
            >
              <Radio.Button value="similarity">相似度 | Similarity</Radio.Button>
              <Radio.Button value="significance">重要性 | Significance</Radio.Button>
              <Radio.Button value="category">类别 | Category</Radio.Button>
            </Radio.Group>
          </div>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <div className="control-panel">
            <div className="panel-title">
              <NodeIndexOutlined /> 标签显示 | Label Display
            </div>
            <Radio.Group 
              value={labelMode} 
              onChange={e => setLabelMode(e.target.value)}
              buttonStyle="solid"
              size="small"
              className="full-width-group"
            >
              <Radio.Button value="all">全部 | All</Radio.Button>
              <Radio.Button value="hover">悬停 | Hover</Radio.Button>
              <Radio.Button value="selected">选中 | Selected</Radio.Button>
              <Radio.Button value="none">隐藏 | None</Radio.Button>
            </Radio.Group>
          </div>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <div className="control-panel">
            <div className="panel-title">
              <AppstoreOutlined /> 布局方式 | Layout Type
            </div>
            <Radio.Group 
              value={layoutMode} 
              onChange={e => setLayoutMode(e.target.value)}
              buttonStyle="solid"
              size="small"
              className="full-width-group"
            >
              <Radio.Button value="force">力导向 | Force</Radio.Button>
              <Radio.Button value="radial">放射状 | Radial</Radio.Button>
              <Radio.Button value="cluster">聚类 | Cluster</Radio.Button>
            </Radio.Group>
          </div>
        </Col>
        
        <Col xs={24} md={16} lg={16}>
          <div className="control-panel">
            <div className="panel-title">
              相似度阈值 | Similarity Threshold <span className="threshold-value">{Math.round(similarityThreshold * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={similarityThreshold}
              onChange={setSimilarityThreshold}
              tipFormatter={value => `${Math.round(value * 100)}%`}
            />
            <div className="threshold-description">
              已筛选出{diseaseCount}个相似疾病 | {diseaseCount} similar diseases filtered
            </div>
          </div>
        </Col>
        
        <Col xs={24} md={8} lg={8}>
          <div className="control-panel buttons-panel">
            <div className="zoom-controls">
              <Tooltip title="放大 | Zoom In">
                <Button 
                  icon={<ZoomInOutlined />} 
                  onClick={onZoomIn}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="缩小 | Zoom Out">
                <Button 
                  icon={<ZoomOutOutlined />} 
                  onClick={onZoomOut}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="重置视图 | Reset View">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={onReset}
                  size="small"
                />
              </Tooltip>
              <Tooltip title={isFullscreen ? "退出全屏 | Exit Fullscreen" : "全屏显示 | Fullscreen"}>
                <Button 
                  icon={isFullscreen ? <ShrinkOutlined /> : <ExpandAltOutlined />} 
                  onClick={onToggleFullscreen}
                  size="small"
                />
              </Tooltip>
            </div>
            
            <div className="view-toggle">
              <span className="toggle-label">3D视图 | 3D View</span>
              <Switch 
                checked={is3DView} 
                onChange={checked => setIs3DView(checked)} 
                size="small"
              />
              <Tooltip title="3D视图可能需要更多计算资源 | 3D view may require more computing resources">
                <InfoCircleOutlined className="info-icon" />
              </Tooltip>
            </div>
          </div>
        </Col>
      </Row>
      
      <Divider style={{ margin: '12px 0' }} />
    </div>
  );
};

export default NetworkControls; 