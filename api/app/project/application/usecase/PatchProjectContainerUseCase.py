from datetime import datetime, timezone

from ulid import ULID

from app.project.application.command import PatchProjectContainerCommand
from app.project.application.command.BasePatchCommand import to_domain_part
from app.project.domain.entity import ProjectContainer
from app.project.domain.repository import ProjectContainerRepository


class PatchProjectContainerUseCase:
    def __init__(self, project_container_repository: ProjectContainerRepository) -> None:
        self.project_container_repository: ProjectContainerRepository = project_container_repository

    def __call__(
        self,
        project_container_id: ULID,
        command: PatchProjectContainerCommand,
    ) -> ProjectContainer:
        project_container: ProjectContainer = self.project_container_repository.get_by_id(id=project_container_id)
        has_changed: bool = False
        if command.name is not None:
            has_changed = True
            project_container.container_name = command.name
        if command.completed is not None:
            has_changed = True
            project_container.completed = command.completed
        if command.parts is not None:
            has_changed = True
            project_container.parts = [
                to_domain_part(
                    command_part=command_part,
                    project_id=project_container.project_id,
                    container_id=project_container_id,
                )
                for command_part in command.parts
            ]
        if has_changed:
            project_container.updated_at = datetime.now(timezone.utc)
        return self.project_container_repository.save(project_container=project_container)
