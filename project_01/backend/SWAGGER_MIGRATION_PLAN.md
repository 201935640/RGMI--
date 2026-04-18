# 零基础团队Swagger迁移方案

## 现状分析

✅ **你们已经有的：**
- Flask后端项目
- 可以运行的API接口
- 基本的Markdown文档（虽然不够规范）

❌ **你们缺少的：**
- Swagger使用经验
- 规范的API文档
- 数据模型定义

## 🎯 迁移策略：分3步走

### 第一步：试点（1-2天）
选择1个最简单的接口改造，熟悉流程

### 第二步：推广（1周）
改造剩余的核心接口

### 第三步：规范（长期）
新接口必须使用Swagger

---

## 📝 第一步：试点改造（详细教程）

### 选择试点接口

建议选择：`/compare_diseases` 接口
- 逻辑简单
- 参数少
- 你们已经熟悉

### 改造步骤（跟着做）

#### 1. 备份原始代码

```bash
cd D:\project\计设\RGMI--\project_01\backend\server
cp app.py app_backup.py
```

#### 2. 在app.py顶部添加导入

**找到这一行：**
```python
from flask import Flask, request, jsonify
```

**改成：**
```python
from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields, Namespace
```

#### 3. 初始化Swagger（在创建Flask app后）

**找到这一行：**
```python
app = Flask(__name__)
CORS(app)
```

**在后面添加：**
```python
# 初始化Swagger
api = Api(
    app,
    version='1.0',
    title='RGMI 2026 智能医药研发系统 API',
    description='疾病相似度分析和药物推荐系统',
    doc='/api/docs'  # Swagger UI访问路径
)

# 创建命名空间
disease_ns = Namespace('diseases', description='疾病相关操作')
api.add_namespace(disease_ns, path='/api/diseases')
```

#### 4. 定义数据模型（复制粘贴即可）

**在所有路由定义之前添加：**
```python
# ========== 数据模型定义 ==========

# 疾病对比请求模型
compare_request = disease_ns.model('CompareDiseaseRequest', {
    'id1': fields.String(
        required=True,
        description='第一个疾病ID，格式如C0023212',
        example='C0023212'
    ),
    'id2': fields.String(
        required=True,
        description='第二个疾病ID，格式如C0024141',
        example='C0024141'
    )
})

# 疾病对比响应模型
compare_response = disease_ns.model('CompareDiseaseResponse', {
    'similarity': fields.Float(
        description='总体相似度，范围0-1',
        example=0.487
    ),
    'similarity_data': fields.List(
        fields.Float,
        description='三维相似度数组：[0]=HPO表型相似度, [1]=miRNA相似度, [2]=基因交互重合度',
        example=[0.0856, 0.0787, 0.0728]
    ),
    'shared_genes': fields.List(
        fields.String,
        description='共享基因列表',
        example=['GENE1', 'GENE2']
    ),
    'chord_data': fields.Raw(
        description='和弦图数据',
        example={'nodes': [], 'links': []}
    )
})
```

#### 5. 改造路由（对比原始代码和新代码）

**原始代码：**
```python
@app.route('/compare_diseases', methods=['POST'])
def compare_diseases():
    data = request.json
    id1, id2 = data.get('id1'), data.get('id2')
    
    # ... 你的业务逻辑 ...
    
    return jsonify(result)
```

**改造后：**
```python
@disease_ns.route('/compare')
class DiseaseCompare(Resource):
    @disease_ns.doc('compare_diseases')
    @disease_ns.expect(compare_request, validate=True)
    @disease_ns.response(200, 'Success', compare_response)
    @disease_ns.response(400, 'Invalid Input')
    @disease_ns.response(404, 'Disease Not Found')
    def post(self):
        """
        对比两个疾病的相似度
        
        返回三个维度的相似度分析：
        - similarity_data[0]: HPO表型相似度
        - similarity_data[1]: miRNA相似度
        - similarity_data[2]: 基因交互重合度
        """
        data = request.json
        id1, id2 = data.get('id1'), data.get('id2')
        
        # ... 你的业务逻辑（保持不变）...
        
        return result  # 不需要jsonify，Flask-RESTX会自动处理
```

**关键变化：**
- `@app.route` → `@disease_ns.route`
- 函数 → 类（继承Resource）
- 添加装饰器说明请求/响应格式
- 添加文档字符串

#### 6. 测试

```bash
# 启动服务
python app.py

# 访问Swagger UI
浏览器打开：http://localhost:5000/api/docs
```

**检查清单：**
- [ ] 能看到Swagger UI界面
- [ ] 能看到 `/api/diseases/compare` 接口
- [ ] 点击接口能看到详细的请求/响应说明
- [ ] 点击"Try it out"能测试接口
- [ ] 测试返回正确的数据

---

## 📋 第二步：改造其他接口（模板）

### 药物推荐接口改造模板

```python
# 1. 定义数据模型
drug_request = drug_ns.model('DrugRepositioningRequest', {
    'disease_id': fields.String(
        required=True,
        description='疾病ID',
        example='C0023212'
    )
})

drug_item = drug_ns.model('DrugItem', {
    'drug_name': fields.String(description='药物名称', example='Aspirin'),
    'confidence': fields.Float(description='置信度(0-1)', example=0.85, min=0.0, max=1.0),
    'evidence': fields.String(description='推荐依据', example='基于相似疾病分析')
})

drug_response = drug_ns.model('DrugRepositioningResponse', {
    'disease_id': fields.String(description='查询的疾病ID'),
    'recommendations': fields.List(fields.Nested(drug_item), description='推荐药物列表')
})

# 2. 改造路由
@drug_ns.route('/repositioning')
class DrugRepositioning(Resource):
    @drug_ns.expect(drug_request, validate=True)
    @drug_ns.response(200, 'Success', drug_response)
    def post(self):
        """基于疾病相似度的药物重定位推荐"""
        data = request.json
        disease_id = data.get('disease_id')
        
        # ... 你的业务逻辑 ...
        
        return result
```

### 通用改造模板（复制粘贴修改）

```python
# 步骤1：定义请求模型
your_request = ns.model('YourRequest', {
    'param1': fields.String(required=True, description='参数1说明', example='示例值'),
    'param2': fields.Integer(description='参数2说明', example=123)
})

# 步骤2：定义响应模型
your_response = ns.model('YourResponse', {
    'field1': fields.String(description='字段1说明', example='示例值'),
    'field2': fields.List(fields.String, description='字段2说明')
})

# 步骤3：改造路由
@ns.route('/your-endpoint')
class YourResource(Resource):
    @ns.expect(your_request, validate=True)
    @ns.response(200, 'Success', your_response)
    def post(self):
        """接口功能描述"""
        data = request.json
        
        # 你的业务逻辑
        
        return result
```

---

## 🎓 团队培训材料

### 给后端开发者的5分钟教程

**Q: 我需要学什么？**
A: 只需要学3个概念：
1. **Namespace（命名空间）**：API分组，类似文件夹
2. **Model（数据模型）**：定义请求/响应的数据结构
3. **Resource（资源类）**：把函数改成类

**Q: 改造一个接口要多久？**
A: 第一次30分钟，熟练后10分钟

**Q: 会不会破坏现有代码？**
A: 不会，业务逻辑完全不变，只是换个写法

**Q: 如果改错了怎么办？**
A: 我们有备份（app_backup.py），而且可以逐个接口改，不影响其他接口

### 常用字段类型速查表

```python
# 基础类型
fields.String()          # 字符串
fields.Integer()         # 整数
fields.Float()           # 浮点数
fields.Boolean()         # 布尔值

# 复杂类型
fields.List(fields.String)              # 字符串数组
fields.List(fields.Nested(model))       # 对象数组
fields.Raw()                            # 任意JSON对象

# 常用参数
required=True            # 必填
description='说明'       # 字段说明
example='示例值'         # 示例数据
min=0, max=100          # 数值范围
```

### 装饰器速查表

```python
@ns.route('/path')                      # 定义路由
@ns.expect(model, validate=True)        # 定义请求格式并验证
@ns.response(200, 'Success', model)     # 定义成功响应
@ns.response(400, 'Bad Request')        # 定义错误响应
@ns.doc('operation_id')                 # 设置操作ID
```

---

## 📊 迁移进度跟踪表

| 接口名称 | 原路径 | 新路径 | 负责人 | 状态 | 完成日期 |
|---------|--------|--------|--------|------|---------|
| 疾病对比 | /compare_diseases | /api/diseases/compare | [后端] | ⏳待开始 | - |
| 药物推荐 | /drug_repositioning | /api/drugs/repositioning | [后端] | ⏳待开始 | - |
| ... | ... | ... | ... | ... | ... |

**状态说明：**
- ⏳ 待开始
- 🔄 进行中
- ✅ 已完成
- ❌ 有问题

---

## 🚨 常见问题和解决方案

### 问题1：运行报错 `ImportError: cannot import name 'Api'`
**原因：** 没有安装flask-restx
**解决：**
```bash
source activate project1
pip install flask-restx -i http://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
```

### 问题2：Swagger UI显示空白
**原因：** 路由配置错误
**解决：** 检查是否正确添加了 `api.add_namespace()`

### 问题3：接口测试返回404
**原因：** 路径变了，前端还在用旧路径
**解决：** 
- 方案A：保留旧路径，同时添加新路径（过渡期）
- 方案B：通知前端更新路径

### 问题4：不知道怎么定义复杂的数据结构
**原因：** 对fields不熟悉
**解决：** 参考 app_with_swagger.py 中的示例，或查看上面的"常用字段类型速查表"

### 问题5：改造后接口不工作了
**原因：** 可能是业务逻辑有问题
**解决：**
1. 检查是否正确获取了request.json
2. 检查返回值格式是否正确
3. 查看控制台错误信息
4. 如果实在不行，恢复备份：`cp app_backup.py app.py`

---

