
from datetime import date, datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, computed_field, field_validator

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

class Address(BaseModel):
    street: str
    barangay: str
    municipality: str
    province: str
    country: str

class Person(BaseModel):
    firstName: str
    lastName: str
    birthDate: str
    contactNumber: Optional[str] = None
    address: Optional[Address]
    gender: Gender

    @computed_field
    @property
    def fullName(self) -> str:
        return f'{self.firstName} {self.lastName}'
    
    @computed_field
    @property
    def age(self) -> int:
        return self._calculateAge(self.birthDateObject)
    
    @field_validator('birthDate')
    @classmethod
    def validBirthDate(cls, value: str):
        try:
            birthDate = datetime.strptime(value, "%Y-%m-%d").date()
            age = cls._calculateAge(cls, birthDate)

            if(age <= 0):
                raise ValueError('BirthDate is not valid format')
            
            return value
        except ValueError:
            raise

    @property
    def birthDateObject(self) -> date:
        return datetime.strptime(self.birthDate, "%Y-%m-%d").date()
    
    def _calculateAge(self, birthDate: date) -> int:
        today = date.today()
        age = today.year - birthDate.year - ((today.month, today.day) < (birthDate.month, birthDate.day))
        return age
