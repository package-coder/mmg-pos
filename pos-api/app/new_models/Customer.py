
from enum import Enum
from typing import Optional
from pydantic import Field, model_validator

from app.new_models.User import Person


class CustomerType(str, Enum):
    MEMBER = "MEMBER"
    NON_MEMBER = "NON_MEMBER"
    GOVERNMENT_MEMBER = "GOVERNMENT_MEMBER"


class Customer(Person):
    customerType: CustomerType = Field(default=CustomerType.NON_MEMBER)
    tinNumber: str
    customerTypeNumber: Optional[str] = None

    @model_validator(mode='after')
    def requireCustomerNumberWhenMember(self):
        if(self.customerType == CustomerType.GOVERNMENT_MEMBER and self.customerTypeNumber is None):
            raise ValueError(f'Customer Number should not be none when customer type is {CustomerType.GOVERNMENT_MEMBER}')
        return self
