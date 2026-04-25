
import abc
import pymongo
from app.config import DATABASE, ENVIRONMENT, IS_DEVELOPMENT, IS_INTERNAL_PRODUCTION, IS_LOCAL_DEVELOPMENT, IS_PRODUCTION, LOCAL_DATABASE_URL, REMOTE_DATABASE_URL

class Database(abc.ABC):
    def __init__(self, config):
        self.config = config

    @abc.abstractmethod
    def connect(self):
        pass

    @abc.abstractmethod
    def close(self):
        pass


class MongoDB(Database):
    def connect(self):
        self._connection = pymongo.MongoClient(self.config['uri'])
        db = self._connection[self.config['database']]

        print(f'CONNECTED_DB [{ENVIRONMENT}]: ', self.config['database'], self.config['uri'])
        return db

    def close(self):
        self._connection.close()


dev_database = MongoDB({ 
    "uri": LOCAL_DATABASE_URL, 
    "database": DATABASE, 
})

remote_database = MongoDB({ 
    "uri": REMOTE_DATABASE_URL, 
    "database": DATABASE, 
})

backup_database = MongoDB({ 
    "uri": LOCAL_DATABASE_URL, 
    "database": DATABASE, 
})

internal_prod_database = MongoDB({ 
    "uri": LOCAL_DATABASE_URL, 
    "database": DATABASE, 
})

def get_current_database():
    if IS_DEVELOPMENT:
        return remote_database
    if IS_INTERNAL_PRODUCTION:
        return internal_prod_database
    if IS_PRODUCTION:
        return remote_database
    if IS_LOCAL_DEVELOPMENT:
        return dev_database
    
def get_current_backup_database():
    # if IS_INTERNAL_PRODUCTION:
    #     return backup_database
    return None