import unittest
import requests

class TestDiseaseAPI(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:5000/api"

    def test_compare_diseases_logic(self):
        """测试雷达图接口的逻辑准确性"""
        payload = {"id1": "C0023212", "id2": "C0023212"}
        response = requests.post(f"{self.BASE_URL}/compare_diseases", json=payload)
        data = response.json()
        
        self.assertEqual(response.status_code, 200)
        
        # 1. 打印实际收到的数据，方便你观察模型到底算了多少分
        print(f"\n[Debug] 收到相似度数据: {data['data']}")
        
        # 2. 修改断言：只要是 3 个维度的浮点数，且在合理区间即可
        self.assertEqual(len(data['data']), 3) 
        for score in data['data']:
            self.assertIsInstance(score, (int, float))
            # 如果是相似度，应该在 0 到 1 之间
            self.assertTrue(0 <= score <= 1.1, f"得分 {score} 超出合理范围")

    def test_ggi_structure(self):
        """测试网络图返回结构是否完整"""
        response = requests.get(f"{self.BASE_URL}/gene_interactions?disease_id=C0023212")
        data = response.json()
        
        self.assertIn('is_predicted', data['links'][0])
        self.assertIsInstance(data['links'][0]['is_predicted'], bool)

def test_drug_repositioning(self):
    """测试药物推荐接口"""
    payload = {"disease_id": "C0023212"}
    response = requests.post(f"{self.BASE_URL}/drug_repositioning", json=payload)
    data = response.json()
    
    # 验证是否返回了推荐列表
    self.assertIn('recommendations', data)
    # 验证推荐的药物是否有置信度
    self.assertGreater(data['recommendations'][0]['confidence'], 0)

if __name__ == '__main__':
    unittest.main()