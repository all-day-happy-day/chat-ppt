from pydantic import BaseModel
from ulid import ULID

from .PartRequest import PartRequest


class PatchProjectRequest(BaseModel):
    name: str | None = None
    template_id: ULID | None = None
    parts: list[PartRequest] | None = None
