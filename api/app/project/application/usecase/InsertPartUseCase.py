from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository
from app.project.domain.types import Parts


class InsertPartUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, project_id: ULID, part: Parts, index: int) -> Project:
        project: Project = self.project_repository.get_by_id(id=project_id)
        project.parts.insert(index, part)
        return self.project_repository.save(project=project)
