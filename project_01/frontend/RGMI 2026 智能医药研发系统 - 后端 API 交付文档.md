------

# RGMI 2026 智能医药研发系统 - 后端 API 交付文档 

**Base URL**: `http://127.0.0.1:5000`

**通信协议**: HTTP/JSON (支持跨域 CORS)

------

## 一、 系统核心逻辑说明（前端必读）

1. **两步走检索策略**：
   - 优先调用 `GET /api/get_saved_similarity`。该接口从预训练汇总 JSON 中读取数据，响应极快（毫秒级）。
   - 若上述接口返回 404，前端应展示“实时推理”按钮，点击后调用 `POST /api/drug_repositioning` 或 `POST /api/query_disease` 触发后端 GPU 模型实时演算。
2. **异构数据处理**：
   - 系统涉及 **UMLS ID**（疾病）、**Entrez ID**（基因）和 **miRNA Name**。前端在渲染弦图或网络图时需注意节点类型的区分。

------

## 二、 核心 API 规范

### 1. 预存相似性与分子特征 (Fast-Cache)

**接口**: `GET /api/get_saved_similarity/<disease_id>/<top_n>`

**描述**: 获取疾病的预存关联基因、miRNA 及相似疾病列表。

- **请求参数**:
  - `disease_id` (String): UMLS 疾病唯一编码。
  - `top_n` (Integer): 返回相似疾病的数量。
- **成功响应 (200)**:

JSON

```
{
    "target_disease": "C0023212",
    "attributes": {
        "associated_gene_names": ["7450", "27035", ...], // 用于渲染关系网/详情
        "associated_miRNA_names": ["rno-miR-25-3p", ...] // 用于调控分析
    },
    "name": "疾病名称",
    "top_diseases": [] // 相似疾病数组
}
```

### 2. 智能药物重定位推理 (AI Engine)

**接口**: `POST /api/drug_repositioning`

**描述**: 调用 GDFM 模型，基于相似疾病的已知药理进行跨领域药物推荐。

- **请求体**:

JSON

```
{ "disease_id": "C0023212" }
```

- **成功响应 (200)**:

JSON

```
{
    "recommendations": [
        {
            "drug_name": "Digoxin (地高辛)",
            "confidence": 0.9999,
            "evidence": "RGMI 深度学习验证：目标疾病与相似疾病 C1961112 的 miRNA 调控特征相似度达 99.99%。"
        }
    ]
}
```

### 3. 疾病相似度比对与弦图数据 (Compare)

**接口**: `POST /api/compare_diseases`

**描述**: 提取两种疾病间的共性致病因子。

- **请求体**:

JSON

```
{ "id1": "C1153706", "id2": "C0020433", "top_k": 5 }
```

- **核心响应字段**:
  - `similarity`: 总体相似度分值。
  - `chord_data`: **前端 ECharts/D3 直接使用**。包含 `nodes` 和 `links`，用于绘制弦图。

### 4. 基因交互网络数据 (Network)

**接口**: `GET /api/gene_interactions`

**描述**: 获取特定疾病关联的 Top-N 基因交互拓扑结构。

- **Query 参数**: `disease_id=C0030846&top_n=5`
- **响应**: 返回标准的图数据结构 (`nodes`, `links`)，支持前端力导向图渲染。

------

## 三、 可视化组件对接建议

| **组件类型**        | **建议数据来源**                          | **说明**                                       |
| ------------------- | ----------------------------------------- | ---------------------------------------------- |
| **3D 雷达图**       | `compare_diseases` -> `similarity_data`   | 展示三个维度的分值。                           |
| **分子连线弦图**    | `compare_diseases` -> `chord_data`        | 展示两种疾病共享的基因连线。                   |
| **知识图谱/网络图** | `gene_interactions`                       | 节点颜色建议：疾病 (#ff4d4f)，基因 (#1890ff)。 |
| **药物推荐列表**    | `drug_repositioning` -> `recommendations` | 建议按 `confidence` 倒序排列。                 |

------

## 四、 错误代码定义

- `404`: 疾病 ID 不在系统知识库内。
- `429`: 请求过快（触发了后端的 `limit_requests` 限制）。
- `500`: 后端计算逻辑报错（如模型权重加载失败）。

------

