from pydantic import BaseModel
from ulid import ULID

from .BasePatchCommand import PartCommand


class PatchProjectCommand(BaseModel):
    name: str | None = None
    template_id: ULID | None = None
    parts: list[PartCommand] | None = None
