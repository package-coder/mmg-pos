
from bson import ObjectId


class JournalEntry:
    _id = None
    date = None
    description = None
    entries = []
    total = None
    status = None
    accounting = []
    @staticmethod
    def fromDict(data: dict):
        item = JournalEntry()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.date = data.get('date')
        item.description = data.get('description')
        item.entries = data.get('entries')
        item.status = data.get("status")
        item.total = data.get("total")
        item.accounting = data.get("accounting")
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "date": self.date,
            "description": self.description,
            "entries": self.entries,
            "status": self.status, 
            "total": self.total,
            "accounting": self.accounting
        }
