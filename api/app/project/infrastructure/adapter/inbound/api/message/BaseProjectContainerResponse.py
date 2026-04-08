from datetime import datetime
from typing import Self

from pydantic import BaseModel

from app.project.domain.entity import ProjectContainer
from app.project.domain.types import Parts


class BaseProjectContainerResponse(BaseModel):
    id: str
    project_id: str
    container_name: str
    created_at: datetime
    updated_at: datetime
    completed: bool
    parts: list[Parts]

    @classmethod
    def from_domain_entity(cls, project_container: ProjectContainer) -> Self:
        return cls(
            id=str(project_container.id),
            project_id=str(project_container.project_id),
            container_name=project_container.container_name,
            created_at=project_container.created_at,
            updated_at=project_container.updated_at,
            completed=project_container.completed,
            parts=project_container.parts,
        )
