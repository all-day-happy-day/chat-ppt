from typing import Literal

from pydantic import BaseModel, Field

from app.project.domain.enum import PartType


class PlainContents(BaseModel):
    type: Literal[PartType.PLAIN] = Field(default=PartType.PLAIN)
