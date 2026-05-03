import logging
from datetime import datetime, timezone
from sqlalchemy import func, and_, or_, desc
from .connection import db
from .models import SearchHistory, OperationTypeEnum

logger = logging.getLogger("RGMI-HistoryDAO")


class HistoryDAO:

    @staticmethod
    def record(user_id, disease_id, disease_name="", operation_type="search",
               detail=None, top_n=20, ip_address=None):
        op_type = OperationTypeEnum.search
        try:
            op_type = OperationTypeEnum(operation_type)
        except ValueError:
            pass

        entry = SearchHistory(
            user_id=user_id,
            disease_id=disease_id,
            disease_name=disease_name,
            operation_type=op_type,
            detail=detail,
            top_n=top_n,
            ip_address=ip_address,
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    @staticmethod
    def get_by_user(user_id, page=1, page_size=20, operation_type=None,
                    disease_id_keyword=None, start_date=None, end_date=None):
        query = SearchHistory.query.filter_by(user_id=user_id, is_deleted=False)

        if operation_type:
            try:
                query = query.filter(SearchHistory.operation_type == OperationTypeEnum(operation_type))
            except ValueError:
                pass

        if disease_id_keyword:
            pattern = f"%{disease_id_keyword}%"
            query = query.filter(
                or_(
                    SearchHistory.disease_id.like(pattern),
                    SearchHistory.disease_name.like(pattern),
                )
            )

        if start_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date)
            query = query.filter(SearchHistory.searched_at >= start_date)

        if end_date:
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date)
            query = query.filter(SearchHistory.searched_at <= end_date)

        total = query.count()
        items = (
            query.order_by(desc(SearchHistory.searched_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "items": [h.to_dict() for h in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    @staticmethod
    def get_by_id(record_id, user_id=None):
        query = SearchHistory.query.filter_by(id=record_id, is_deleted=False)
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        return query.first()

    @staticmethod
    def update(record_id, user_id=None, **kwargs):
        query = SearchHistory.query.filter_by(id=record_id, is_deleted=False)
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        record = query.first()
        if not record:
            return None

        allowed = {"disease_name", "detail", "top_n", "operation_type"}
        for key, value in kwargs.items():
            if key not in allowed:
                continue
            if key == "operation_type" and value:
                try:
                    value = OperationTypeEnum(value)
                except ValueError:
                    continue
            setattr(record, key, value)

        db.session.commit()
        return record

    @staticmethod
    def soft_delete(record_id, user_id=None):
        query = SearchHistory.query.filter_by(id=record_id, is_deleted=False)
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        record = query.first()
        if not record:
            return False
        record.is_deleted = True
        db.session.commit()
        return True

    @staticmethod
    def bulk_soft_delete(user_id, record_ids=None):
        query = SearchHistory.query.filter_by(user_id=user_id, is_deleted=False)
        if record_ids:
            query = query.filter(SearchHistory.id.in_(record_ids))
        count = query.update({"is_deleted": True}, synchronize_session=False)
        db.session.commit()
        return count

    @staticmethod
    def clear_user_history(user_id):
        return HistoryDAO.bulk_soft_delete(user_id)

    @staticmethod
    def count_by_user(user_id):
        return SearchHistory.query.filter_by(user_id=user_id, is_deleted=False).count()

    @staticmethod
    def get_recent(user_id, limit=10):
        return (
            SearchHistory.query.filter_by(user_id=user_id, is_deleted=False)
            .order_by(desc(SearchHistory.searched_at))
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_statistics(user_id):
        query = SearchHistory.query.filter_by(user_id=user_id, is_deleted=False)

        total = query.count()

        by_type = (
            db.session.query(
                SearchHistory.operation_type,
                func.count(SearchHistory.id),
            )
            .filter_by(user_id=user_id, is_deleted=False)
            .group_by(SearchHistory.operation_type)
            .all()
        )

        top_diseases = (
            db.session.query(
                SearchHistory.disease_id,
                SearchHistory.disease_name,
                func.count(SearchHistory.id).label("count"),
            )
            .filter_by(user_id=user_id, is_deleted=False)
            .group_by(SearchHistory.disease_id, SearchHistory.disease_name)
            .order_by(desc("count"))
            .limit(10)
            .all()
        )

        return {
            "total_records": total,
            "by_operation_type": {op.value: cnt for op, cnt in by_type},
            "top_diseases": [
                {"disease_id": did, "disease_name": dname, "count": cnt}
                for did, dname, cnt in top_diseases
            ],
        }

    @staticmethod
    def enforce_limit(user_id, max_records=5000):
        count = SearchHistory.query.filter_by(user_id=user_id, is_deleted=False).count()
        if count <= max_records:
            return 0

        excess = count - max_records
        oldest = (
            SearchHistory.query.filter_by(user_id=user_id, is_deleted=False)
            .order_by(SearchHistory.searched_at.asc())
            .limit(excess)
            .all()
        )
        ids = [r.id for r in oldest]
        if ids:
            SearchHistory.query.filter(SearchHistory.id.in_(ids)).delete(
                synchronize_session=False
            )
            db.session.commit()
        return len(ids)
