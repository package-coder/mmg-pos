
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, computed_field

from app.utils.utils import getLocalDateStr

class CreateTimestampMixin(BaseModel):
    createdAt: str = Field(default_factory=getLocalDateStr)
    createdBy: str

class UpdateTimestampMixin(BaseModel):
    updatedAt: str = Field(default_factory=getLocalDateStr)
    updateBy: str

class AppBaseModel(CreateTimestampMixin, UpdateTimestampMixin):
    pass
