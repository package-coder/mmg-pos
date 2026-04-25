


from datetime import date
from typing import Optional
from pydantic import BaseModel


class DateFilter(BaseModel):
    startDate: Optional[date] = None
    endDate: Optional[date] = None

    def transform(self):
        if(not self.startDate or not self.endDate):
            return {}

        return {
            "date": {
                "$gte": str(self.startDate),
                "$lte": str(self.endDate)
            }
        }

class BranchFilter(BaseModel):
    branchId: Optional[str] = None

    def transform(self):
        if(not self.branchId): 
            return {}
        return { "branchId": self.branchId }