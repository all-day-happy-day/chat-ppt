from pathlib import Path

from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile
from app.powerpoint.domain.repository import TemplateFileRepository
from app.project.domain.entity import Project, ProjectContainer
from app.project.domain.repository import ProjectContainerRepository, ProjectRepository
from app.project.domain.service import PresentationService


class ExportPPTUseCase:
    def __init__(
        self,
        project_container_repository: ProjectContainerRepository,
        project_repository: ProjectRepository,
        template_file_repository: TemplateFileRepository,
        presentation_service: PresentationService,
    ) -> None:
        self.project_container_repository: ProjectContainerRepository = project_container_repository
        self.project_repository: ProjectRepository = project_repository
        self.template_file_repository: TemplateFileRepository = template_file_repository
        self.presentation_service: PresentationService = presentation_service

    def __call__(self, project_container_id: ULID, save_ppt_filename: str, project_id: ULID, user_id: ULID) -> Path:
        project_container: ProjectContainer = self.project_container_repository.get_by_id(id=project_container_id)
        project: Project = self.project_repository.get_by_id(id=project_container.project_id)
        template_file: TemplateFile = self.template_file_repository.get_by_template_id(template_id=project.template_id)

        return self.presentation_service.generate_and_save(
            template_file_path=template_file.path,
            parts=project_container.parts,
            save_ppt_filename=save_ppt_filename,
            project_id=project.id,
            user_id=project.user_id,
        )
