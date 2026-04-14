# 疾视 V2.0 前端需求清单 (供后端人员 C 实施 Mock 及接口参考)

## 1. 全局接口规范 (全员一致)
- **Base URL:** `/api/v2/`
- **请求/响应格式:** `application/json`
- **通用响应结构:**
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {},
    "msg": ""
  }
  ```

---

## 2. 接口详细定义

### A. 搜索接口 (用于搜索页无限流展示)
- **Endpoint:** `GET /api/v2/search`
- **参数:** 
  - `q`: 搜索关键词 (string)
  - `type`: 搜索类型 ('gene' | 'disease' | 'all')
- **Mock 返回示例:**
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "results": [
        { "id": "G1", "name": "BRCA1", "type": "gene", "description": "Breast cancer type 1 susceptibility protein" },
        { "id": "D1", "name": "Breast Cancer", "type": "disease", "description": "A cancer that forms in the cells of the breasts." }
      ]
    }
  }
  ```

### B. 疾病关联基因预测接口 (增强原有功能)
- **Endpoint:** `POST /api/v2/predict/disease`
- **参数:** 
  - `disease_id`: 疾病 ID (Varchar 50)
  - `top_k`: 返回的前 K 个结果 (int, 默认 20)
- **Mock 返回示例:**
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "disease_info": { "id": "D1", "name": "Breast Cancer" },
      "predictions": [
        { "gene_id": "G1", "gene_name": "BRCA1", "score": 0.98, "is_known": true },
        { "gene_id": "G2", "gene_name": "BRCA2", "score": 0.95, "is_known": true },
        { "gene_id": "G3", "gene_name": "NEW_GENE", "score": 0.88, "is_known": false }
      ]
    }
  }
  ```

### C. GGI 基因对预测接口 (专项预测页面)
- **Endpoint:** `POST /api/v2/predict/ggi`
- **参数:** 
  - `gene_id_1`: 基因 A ID
  - `gene_id_2`: 基因 B ID
- **Mock 返回示例:**
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "score": 0.92,
      "details": { "method": "VGAE", "embedding_dim": 128 }
    }
  }
  ```

### D. 网络可视化数据接口 (D3.js 网络图)
- **Endpoint:** `GET /api/v2/network`
- **参数:** 
  - `center_id`: 中心节点 ID
  - `depth`: 扩散层级 (int, 1-3)
- **Mock 返回示例:**
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "nodes": [
        { "id": "G1", "label": "BRCA1", "type": "gene" },
        { "id": "D1", "label": "Breast Cancer", "type": "disease" }
      ],
      "links": [
        { "source": "G1", "target": "D1", "weight": 0.95, "is_predicted": false },
        { "source": "G1", "target": "G2", "weight": 0.88, "is_predicted": true }
      ]
    }
  }
  ```
  *注: `is_predicted` 为 true 时，前端 D3 渲染为虚线 (dash line)，为 false 时渲染为实线。*

---

## 3. 数据库字段一致性建议 (人员 C 参考)
- `id` (PK)
- `gene_id` (Varchar 50)
- `disease_id` (Varchar 50)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## 4. 联调关键点
- 状态码 400 用于参数错误，401 用于无权限。
- 所有接口必须支持跨域 (CORS)。
- 请于 Day 2 下班前提供上述接口的 Mock 数据。
