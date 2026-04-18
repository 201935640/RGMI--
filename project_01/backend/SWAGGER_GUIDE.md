# Swagger API文档集成指南

## 一、快速开始

### 1. 安装依赖

```bash
cd D:\project\计设\RGMI--\project_01\backend
pip install flask-restx==1.3.0
```

### 2. 运行示例

```bash
python app_with_swagger.py
```

### 3. 访问Swagger UI

打开浏览器访问：**http://localhost:5000/api/docs**

你会看到一个交互式的API文档界面，可以：
- 查看所有API端点
- 查看请求/响应的数据结构
- 直接在浏览器中测试API
- 查看示例数据

## 二、Swagger的核心优势

### 1. 自动生成文档
代码即文档，修改代码后文档自动更新，永远不会过期。

### 2. 交互式测试
在Swagger UI中可以直接点击"Try it out"按钮测试API：
- 填写参数
- 点击Execute
- 查看实际响应

### 3. 数据验证
使用 `validate=True` 后，Flask会自动验证请求数据格式，减少错误。

### 4. 清晰的数据结构
通过 `fields.model` 定义的数据模型，前端一眼就能看懂：
- 字段名称
- 数据类型
- 是否必填
- 示例值
- 取值范围

## 三、如何改造现有API

### 原始代码（无文档）：
```python
@app.route('/compare_diseases', methods=['POST'])
def compare_diseases():
    data = request.json
    id1 = data.get('id1')
    id2 = data.get('id2')
    # ... 业务逻辑
    return jsonify(result)
```

### 改造后（带Swagger文档）：
```python
@disease_ns.route('/compare')
class DiseaseCompare(Resource):
    @disease_ns.expect(compare_request, validate=True)
    @disease_ns.response(200, 'Success', compare_response)
    def post(self):
        """对比两个疾病的相似度"""
        data = request.json
        id1 = data.get('id1')
        id2 = data.get('id2')
        # ... 业务逻辑（保持不变）
        return result
```

**改动很小，但文档自动生成！**

## 四、关键概念说明

### 1. Namespace（命名空间）
用于API分组，类似文件夹：
```python
disease_ns = Namespace('diseases', description='疾病相关操作')
drug_ns = Namespace('drugs', description='药物推荐操作')
```

### 2. Model（数据模型）
定义请求/响应的数据结构：
```python
compare_request = disease_ns.model('CompareDiseaseRequest', {
    'id1': fields.String(required=True, description='疾病ID', example='C0023212'),
    'id2': fields.String(required=True, description='疾病ID', example='C0024141')
})
```

### 3. 装饰器
- `@disease_ns.expect()`: 定义请求体格式
- `@disease_ns.response()`: 定义响应格式
- `@disease_ns.doc()`: 添加额外文档说明

## 五、常用字段类型

```python
fields.String()      # 字符串
fields.Integer()     # 整数
fields.Float()       # 浮点数
fields.Boolean()     # 布尔值
fields.List()        # 数组
fields.Nested()      # 嵌套对象
fields.Raw()         # 任意JSON对象
```

## 六、实际使用场景

### 场景1：前端开发者查看API
1. 打开 http://localhost:5000/api/docs
2. 点击 `/diseases/compare` 接口
3. 查看"Model"标签，看到完整的数据结构
4. 看到 `similarity_data` 的说明：`[HPO, miRNA, 基因]`
5. 不用问后端，直接开始写代码

### 场景2：测试API
1. 点击"Try it out"
2. 填写：
   ```json
   {
     "id1": "C0023212",
     "id2": "C0024141"
   }
   ```
3. 点击Execute
4. 查看实际返回的数据
5. 不用打开Postman或写curl命令

### 场景3：后端修改API
1. 修改代码中的model定义
2. 重启服务
3. 文档自动更新
4. 前端刷新页面就能看到最新文档