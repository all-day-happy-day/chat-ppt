from pydantic import BaseModel

from .PartRequest import PartRequest


class InsertPartRequest(BaseModel):
    part: PartRequest
    index: int
