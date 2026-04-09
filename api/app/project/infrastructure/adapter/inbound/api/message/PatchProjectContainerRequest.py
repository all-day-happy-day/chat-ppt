from pydantic import BaseModel

from .PartRequest import PartRequest


class PatchProjectContainerRequest(BaseModel):
    container_name: str | None = None
    completed: bool | None = None
    parts: list[PartRequest] | None = None
