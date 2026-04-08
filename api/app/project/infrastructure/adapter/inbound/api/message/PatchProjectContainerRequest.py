from pydantic import BaseModel

from app.project.domain.types import Parts


class PatchProjectContainerRequest(BaseModel):
    container_name: str | None = None
    completed: bool | None = None
    parts: list[Parts] | None = None
