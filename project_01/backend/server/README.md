# 疾病相似性查询API服务器

这是为疾病相似性可视化前端提供实时查询功能的后端API服务器。

## 安装与运行

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务器

```bash
python app.py
```

服务器将在 http://localhost:5000 上运行。

## API 端点

### 1. 健康检查

- **URL**: `/api/health`
- **方法**: GET
- **描述**: 检查API服务器状态
- **响应示例**:
  ```json
  {
    "status": "healthy",
    "model_available": true
  }
  ```

### 2. 查询疾病相似性

- **URL**: `/api/query_disease`
- **方法**: POST
- **请求体**:
  ```json
  {
    "disease_id": "C0023212"
  }
  ```
- **描述**: 根据疾病ID查询相似疾病
- **响应**: 返回疾病相似性结果列表

### 3. 获取可用疾病列表

- **URL**: `/api/available_diseases`
- **方法**: GET
- **描述**: 获取可查询的疾病列表
- **响应**: 返回可查询的疾病列表

## 与前端集成

确保前端应用配置正确的API基础URL（默认为`http://localhost:5000`）。

## 故障排除

如果无法导入RGMI_pretrain模块，服务器将使用示例数据进行响应。 