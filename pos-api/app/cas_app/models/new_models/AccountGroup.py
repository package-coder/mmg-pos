from enum import Enum
from typing import Optional

from pydantic import BaseModel


class EditAccountGroup(BaseModel):
    name: str = None
    description: Optional[str] = None
    accountType: Optional[str] = None