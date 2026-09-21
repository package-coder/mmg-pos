
import abc
import threading
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


# One MongoClient per URI per process. connect() is called from every Repository
# constructor (some per request); building a client each time leaked a connection
# pool per call and exhausted mongo (hundreds of connections -> AutoReconnect).
_clients = {}
_clients_lock = threading.Lock()


class MongoDB(Database):
    def connect(self):
        with _clients_lock:
            client = _clients.get(self.config['uri'])
            if client is None:
                client = _clients[self.config['uri']] = self._new_client()
        self._connection = client
        db = self._connection[self.config['database']]
        return db

    def _new_client(self):
        return pymongo.MongoClient(
            self.config['uri'],
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=60000,
            maxIdleTimeMS=60000,       # drop pooled sockets before the network/mongo kills them
            heartbeatFrequencyMS=10000,
            retryReads=True,
            retryWrites=True,
            maxPoolSize=50,
        )

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