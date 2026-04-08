from datetime import datetime
from typing import Self

from pydantic import BaseModel

from app.project.domain.entity import Project
from app.project.domain.types import Parts


class BaseProjectResponse(BaseModel):
    id: str
    template_id: str
    user_id: str
    name: str
    created_at: datetime
    updated_at: datetime
    parts: list[Parts]

    @classmethod
    def from_domain_entity(cls, project: Project) -> Self:
        return cls(
            id=str(project.id),
            template_id=str(project.template_id),
            user_id=str(project.user_id),
            name=project.name,
            created_at=project.created_at,
            updated_at=project.updated_at,
            parts=project.parts,
        )
