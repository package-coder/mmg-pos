
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Labtest(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: Optional[str] = None
    price: float = Field(gt=1)
    quantity: int = Field(ge=1, default=1)
    categoryId: Optional[str] = None
