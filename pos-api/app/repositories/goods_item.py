
from pydash import omit
from app.repositories.base import Repository


class GoodsItemRepository(Repository):
    _collection = 'goods_receipt_items'

    def find(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        '_id': {'$toString': '$_id' },
                    }
                },
                { '$sort': {"_id":-1} },
                *args,
            ]))
            return data
        except Exception as e:
            raise Exception(f"MongoDB find error: {e}")

    def insert_one(self, data):
        result = super().insert_one(data)
        return self.find_one({ "_id": result.inserted_id })
