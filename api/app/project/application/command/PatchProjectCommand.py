from pydantic import BaseModel

from .BasePatchCommand import PartCommand


class PatchProjectCommand(BaseModel):
    name: str | None = None
    parts: list[PartCommand] | None = None
