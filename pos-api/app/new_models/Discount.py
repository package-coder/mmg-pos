
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CustomerDiscountType(str, Enum):
    # MEMBER = "MEMBER"
    # NON_MEMBER = "NON_MEMBER"
    ALL = "all"
    GOVERNMENT_MEMBER = "seniorcitizenpwd"

class MemberType(str, Enum):
    SENIOR_CITIZEN = "senior_citizen"
    NAAC = "naac"
    PWD = "pwd"
    SOLO_PARENT = "solo_parent"

class DiscountType(str, Enum):
    FIXED = "fixed"
    PERCENTAGE = "percentage"

class Discount(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    type: DiscountType
    name: str
    value: float = Field(gt=1)
    memberType: Optional[MemberType] = None
    description: Optional[str] = None

    def calculateTotalDiscount(self, total):
        if(self.type == DiscountType.FIXED):
            return self.value
        
        return total * (self.value / 100)
    
