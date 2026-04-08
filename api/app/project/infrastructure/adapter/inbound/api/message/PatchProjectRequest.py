from pydantic import BaseModel

from app.project.domain.types import Parts


class PatchProjectRequest(BaseModel):
    name: str | None = None
    parts: list[Parts] | None = None
