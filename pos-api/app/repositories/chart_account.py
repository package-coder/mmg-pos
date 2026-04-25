


from app.repositories.base import Repository


class ChartAccountRepository(Repository):
    _collection = 'chart_of_accounts'


    def find(self, query={}, *args):
        try: 
            data = list(self._db[self._collection].aggregate([
                { '$match': query },
                {
                    '$addFields': {
                        'accountGroup': {'$toObjectId': '$accountGroup'},
                        'accountType': {'$toObjectId': '$accountType'}
                    }
                },
                { 
                    '$lookup': {
                        'from': 'accountstype',
                        'localField': 'accountType',
                        'foreignField': '_id',
                        'as': 'accountType'
                    }, 
                },
                { 
                    '$lookup': {
                        'from': 'accountsgroup',
                        'localField': 'accountGroup',
                        'foreignField': '_id',
                        'as': 'accountGroup'
                    }, 
                },
                { "$unwind": {
                    'path': "$accountType",
                    'preserveNullAndEmptyArrays': True    
                }},
                { "$unwind": {
                    'path': "$accountGroup",
                    'preserveNullAndEmptyArrays': True    
                }},
                {
                    '$addFields': {
                        '_id': {'$toString': '$_id' },
                        'accountGroup._id': {'$toString': '$accountGroup._id' },
                        'accountType._id': {'$toString': '$accountType._id' },
                    }
                },
                { '$sort': {"_id":-1} },
                *args,
            ]))

            coa = []
            for item in data:
                if item.get('accountGroup') is None or item.get('accountGroup').get('_id') is None:
                    item['accountGroup'] = None
                
                if item.get('accountType') is None or item.get('accountType').get('_id') is None:
                    item['accountType'] = None
                
                coa.append(item)
            return coa

        except Exception as e:
            raise e