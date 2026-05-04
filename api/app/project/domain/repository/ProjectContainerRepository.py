from abc import ABC, abstractmethod

from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.shared.page import Page, PagingOptions


class ProjectContainerRepository(ABC):
    @abstractmethod
    def save(self, project_container: ProjectContainer) -> ProjectContainer:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, id: ULID) -> ProjectContainer:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_all_by_project_id(self, project_id: ULID) -> list[ProjectContainer]:
        raise NotImplementedError

    @abstractmethod
    def get_all_paged_by_project_id(self, project_id: ULID, paging_options: PagingOptions) -> Page[ProjectContainer]:
        raise NotImplementedError
