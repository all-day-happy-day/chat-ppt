from pydantic import BaseModel

from .PartRequest import PartRequest


class PatchProjectRequest(BaseModel):
    name: str | None = None
    parts: list[PartRequest] | None = None
