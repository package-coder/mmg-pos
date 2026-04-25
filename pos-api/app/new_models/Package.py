
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PackageType(str, Enum):
    PACKAGE = "package"
    PROMO = "promo"


class Package(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: Optional[str] = None
    type: PackageType = Field(default=PackageType.PACKAGE)
