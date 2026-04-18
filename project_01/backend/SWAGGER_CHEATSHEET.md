# Swagger快速参考卡片 - 打印贴在桌上

## 🚀 改造一个接口的3步骤

### 步骤1：定义数据模型（复制粘贴修改）
```python
# 请求模型
request_model = ns.model('RequestName', {
    'param_name': fields.String(
        required=True,           # 是否必填
        description='参数说明',   # 字段说明
        example='示例值'         # 示例数据
    )
})

# 响应模型
response_model = ns.model('ResponseName', {
    'field_name': fields.String(description='字段说明', example='示例值')
})
```

### 步骤2：改造路由
```python
# 原来的写法
@app.route('/path', methods=['POST'])
def function_name():
    data = request.json
    # 业务逻辑
    return jsonify(result)

# 改成
@ns.route('/path')
class ClassName(Resource):
    @ns.expect(request_model, validate=True)
    @ns.response(200, 'Success', response_model)
    def post(self):
        """接口功能描述"""
        data = request.json
        # 业务逻辑（不变）
        return result  # 不需要jsonify
```

### 步骤3：测试
```
访问：http://localhost:5000/api/docs
点击接口 → Try it out → Execute
```

---

## 📋 常用字段类型

| 类型 | 代码 | 示例 |
|------|------|------|
| 字符串 | `fields.String()` | `"hello"` |
| 整数 | `fields.Integer()` | `123` |
| 浮点数 | `fields.Float()` | `0.85` |
| 布尔值 | `fields.Boolean()` | `true` |
| 字符串数组 | `fields.List(fields.String)` | `["a", "b"]` |
| 对象数组 | `fields.List(fields.Nested(model))` | `[{...}, {...}]` |
| 任意对象 | `fields.Raw()` | `{...}` |

---

## 🎯 常用装饰器

```python
@ns.route('/path')              # 定义路由
@ns.doc('operation_id')         # 操作ID（可选）
@ns.expect(model, validate=True) # 定义请求格式，validate=True自动验证
@ns.response(200, 'Success', model) # 定义成功响应
@ns.response(400, 'Bad Request')    # 定义错误响应
@ns.response(404, 'Not Found')      # 定义404响应
```

---

## 💡 常见问题速查

### Q: 数组中每个元素的含义怎么说明？
```python
'similarity_data': fields.List(
    fields.Float,
    description='三维数组：[0]=HPO, [1]=miRNA, [2]=基因',
    example=[0.08, 0.07, 0.07]
)
```

### Q: 字段可能为空怎么标注？
```python
'optional_field': fields.String(
    required=False,  # 不是必填
    description='可选字段，可能为null'
)
```

### Q: 数值范围怎么限制？
```python
'confidence': fields.Float(
    min=0.0,
    max=1.0,
    description='置信度，范围0-1'
)
```

### Q: 嵌套对象怎么定义？
```python
# 先定义内层对象
inner_model = ns.model('Inner', {
    'name': fields.String()
})

# 再在外层引用
outer_model = ns.model('Outer', {
    'data': fields.Nested(inner_model)
})
```

### Q: 对象数组怎么定义？
```python
item_model = ns.model('Item', {
    'name': fields.String()
})

list_model = ns.model('List', {
    'items': fields.List(fields.Nested(item_model))
})
```

---

## 🔧 初始化代码（只需要写一次）

```python
from flask import Flask
from flask_restx import Api, Resource, fields, Namespace
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 初始化Swagger
api = Api(
    app,
    version='1.0',
    title='项目名称',
    description='项目描述',
    doc='/api/docs'
)

# 创建命名空间
disease_ns = Namespace('diseases', description='疾病相关')
drug_ns = Namespace('drugs', description='药物相关')

api.add_namespace(disease_ns, path='/api/diseases')
api.add_namespace(drug_ns, path='/api/drugs')
```

---

## ⚠️ 常见错误

### 错误1：忘记继承Resource
```python
# ❌ 错误
@ns.route('/path')
def function():
    pass

# ✅ 正确
@ns.route('/path')
class ClassName(Resource):
    def post(self):
        pass
```

### 错误2：忘记定义HTTP方法
```python
# ❌ 错误
class ClassName(Resource):
    pass  # 没有定义post/get等方法

# ✅ 正确
class ClassName(Resource):
    def post(self):  # 或 get, put, delete
        pass
```

### 错误3：model名称重复
```python
# ❌ 错误
model1 = ns.model('Request', {...})
model2 = ns.model('Request', {...})  # 名称重复

# ✅ 正确
model1 = ns.model('CompareRequest', {...})
model2 = ns.model('DrugRequest', {...})
```

---

## 📞 遇到问题？

1. 查看示例代码：`app_with_swagger.py`
2. 查看详细教程：`SWAGGER_MIGRATION_PLAN.md`
3. 访问Swagger UI查看实际效果：`http://localhost:5000/api/docs`
4. 搜索错误信息：大部分错误都是拼写或缩进问题

---

## ✅ 改造检查清单

改造完一个接口后，检查：
- [ ] 能在Swagger UI中看到接口
- [ ] 能看到完整的请求参数说明
- [ ] 能看到完整的响应字段说明
- [ ] 有示例数据
- [ ] 点击"Try it out"能测试
- [ ] 测试返回正确的数据
- [ ] 原有功能没有被破坏

---

**记住：业务逻辑不需要改，只是换个写法！**
