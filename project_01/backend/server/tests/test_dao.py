from db.user_dao import UserDAO
from db.history_dao import HistoryDAO
from api.auth_utils import hash_password


def test_user_dao_crud(app):
    with app.app_context():
        user = UserDAO.create_user(
            username="dao_user",
            email="dao_user@test.com",
            password_hash=hash_password("123456"),
            phone="13800000000",
            nickname="DAO",
            role_name="user",
        )
        assert user.id is not None

        got = UserDAO.get_by_username("dao_user")
        assert got.email == "dao_user@test.com"

        updated = UserDAO.update_user(got.id, nickname="DAO2")
        assert updated.nickname == "DAO2"

        assert UserDAO.soft_delete(got.id) is True
        assert UserDAO.get_by_id(got.id) is None


def test_history_dao_crud(app):
    with app.app_context():
        user = UserDAO.create_user(
            username="hist_user",
            email="hist_user@test.com",
            password_hash=hash_password("123456"),
            role_name="user",
        )
        rec = HistoryDAO.record(
            user_id=user.id,
            disease_id="C1001",
            disease_name="Disease X",
            operation_type="search",
            detail='{"a":1}',
            top_n=10,
            ip_address="127.0.0.1",
        )
        assert rec.id is not None

        item = HistoryDAO.get_by_id(rec.id, user_id=user.id)
        assert item.disease_id == "C1001"

        updated = HistoryDAO.update(rec.id, user_id=user.id, disease_name="Disease Y")
        assert updated.disease_name == "Disease Y"

        data = HistoryDAO.get_by_user(user.id, page=1, page_size=10)
        assert data["total"] == 1

        assert HistoryDAO.soft_delete(rec.id, user_id=user.id) is True
        data2 = HistoryDAO.get_by_user(user.id, page=1, page_size=10)
        assert data2["total"] == 0
