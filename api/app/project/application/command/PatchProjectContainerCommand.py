from pydantic import BaseModel

from .BasePatchCommand import PartCommand


class PatchProjectContainerCommand(BaseModel):
    name: str | None = None
    completed: bool | None = None
    parts: list[PartCommand] | None = None
