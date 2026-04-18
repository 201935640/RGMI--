"""
Flask API with Swagger Documentation
使用Flask-RESTX自动生成API文档的示例
"""

from flask import Flask, request
from flask_restx import Api, Resource, fields, Namespace
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 初始化Swagger API
api = Api(
    app,
    version='1.0',
    title='RGMI 2026 智能医药研发系统 API',
    description='疾病相似度分析和药物推荐系统的RESTful API',
    doc='/api/docs',  # Swagger UI访问路径
    prefix='/api'
)

# 创建命名空间（API分组）
disease_ns = Namespace('diseases', description='疾病相关操作')
drug_ns = Namespace('drugs', description='药物推荐操作')

api.add_namespace(disease_ns)
api.add_namespace(drug_ns)

# ============ 定义数据模型（用于文档和验证） ============

# 疾病对比请求模型
compare_request = disease_ns.model('CompareDiseaseRequest', {
    'id1': fields.String(
        required=True,
        description='第一个疾病ID',
        example='C0023212'
    ),
    'id2': fields.String(
        required=True,
        description='第二个疾病ID',
        example='C0024141'
    )
})

# 疾病对比响应模型
compare_response = disease_ns.model('CompareDiseaseResponse', {
    'similarity': fields.Float(
        description='总体相似度 (0-1之间)',
        example=0.487
    ),
    'similarity_data': fields.List(
        fields.Float,
        description='三维相似度数组: [HPO表型相似度, miRNA相似度, 基因交互重合度]',
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

# 药物推荐请求模型
drug_request = drug_ns.model('DrugRepositioningRequest', {
    'disease_id': fields.String(
        required=True,
        description='疾病ID',
        example='C0023212'
    )
})

# 单个药物模型
drug_item = drug_ns.model('DrugItem', {
    'drug_name': fields.String(
        description='药物名称',
        example='Aspirin'
    ),
    'confidence': fields.Float(
        description='置信度 (0-1之间的浮点数)',
        example=0.85,
        min=0.0,
        max=1.0
    ),
    'evidence': fields.String(
        description='推荐依据',
        example='基于相似疾病C0024141的治疗方案分析'
    )
})

# 药物推荐响应模型
drug_response = drug_ns.model('DrugRepositioningResponse', {
    'disease_id': fields.String(
        description='查询的疾病ID',
        example='C0023212'
    ),
    'recommendations': fields.List(
        fields.Nested(drug_item),
        description='推荐的药物列表'
    )
})

# 错误响应模型
error_model = api.model('Error', {
    'error': fields.String(description='错误类型'),
    'code': fields.Integer(description='错误码'),
    'message': fields.String(description='错误详细信息')
})


# ============ API端点定义 ============

@disease_ns.route('/compare')
class DiseaseCompare(Resource):
    @disease_ns.doc('compare_diseases')
    @disease_ns.expect(compare_request, validate=True)
    @disease_ns.response(200, 'Success', compare_response)
    @disease_ns.response(400, 'Invalid Input', error_model)
    @disease_ns.response(404, 'Disease Not Found', error_model)
    def post(self):
        """
        对比两个疾病的相似度

        返回三个维度的相似度分析：
        - similarity_data[0]: HPO表型相似度
        - similarity_data[1]: miRNA相似度
        - similarity_data[2]: 基因交互重合度
        """
        data = request.json
        id1 = data.get('id1')
        id2 = data.get('id2')

        # 参数验证
        if not id1 or not id2:
            return {
                'error': 'Missing parameters',
                'code': 400,
                'message': '缺少必需参数 id1 或 id2'
            }, 400

        # TODO: 实际的业务逻辑
        # 这里是示例返回
        return {
            'similarity': 0.487,
            'similarity_data': [0.0856, 0.0787, 0.0728],
            'shared_genes': ['GENE1', 'GENE2'],
            'chord_data': {
                'nodes': [],
                'links': []
            }
        }


@drug_ns.route('/repositioning')
class DrugRepositioning(Resource):
    @drug_ns.doc('drug_repositioning')
    @drug_ns.expect(drug_request, validate=True)
    @drug_ns.response(200, 'Success', drug_response)
    @drug_ns.response(400, 'Invalid Input', error_model)
    @drug_ns.response(404, 'Disease Not Found', error_model)
    def post(self):
        """
        基于疾病相似度的药物重定位推荐

        分析与目标疾病相似的疾病的治疗方案，推荐可能有效的药物。
        返回的药物列表按置信度降序排列。
        """
        data = request.json
        disease_id = data.get('disease_id')

        if not disease_id:
            return {
                'error': 'Missing parameter',
                'code': 400,
                'message': '缺少必需参数 disease_id'
            }, 400

        # TODO: 实际的业务逻辑
        # 这里是示例返回
        return {
            'disease_id': disease_id,
            'recommendations': [
                {
                    'drug_name': 'Aspirin',
                    'confidence': 0.85,
                    'evidence': '基于相似疾病C0024141的治疗方案分析'
                },
                {
                    'drug_name': 'Ibuprofen',
                    'confidence': 0.72,
                    'evidence': '基于基因交互网络分析'
                }
            ]
        }


if __name__ == '__main__':
    print("=" * 60)
    print("Swagger UI 访问地址: http://localhost:5000/api/docs")
    print("=" * 60)
    app.run(debug=True, port=5000)
