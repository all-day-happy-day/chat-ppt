from datetime import datetime, timezone

from ulid import ULID

from app.project.application.command import PatchProjectCommand
from app.project.application.command.BasePatchCommand import to_domain_part
from app.project.domain.entity import Project
from app.project.domain.repository import ProjectRepository


class PatchProjectUseCase:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository: ProjectRepository = project_repository

    def __call__(self, project_id: ULID, command: PatchProjectCommand) -> Project:
        project: Project = self.project_repository.get_by_id(id=project_id)
        has_changed: bool = False
        if command.name is not None:
            has_changed = True
            project.name = command.name
        if command.parts is not None:
            has_changed = True
            project.parts = [
                to_domain_part(command_part=command_part, project_id=project_id) for command_part in command.parts
            ]
        if has_changed:
            project.updated_at = datetime.now(timezone.utc)
        return self.project_repository.save(project=project)
