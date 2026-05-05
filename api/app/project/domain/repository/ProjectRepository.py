from abc import ABC, abstractmethod

from ulid import ULID

from app.project.domain.entity import Project
from app.shared.page import Page, PagingOptions


class ProjectRepository(ABC):
    @abstractmethod
    def save(self, project: Project) -> Project:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, id: ULID) -> Project:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_all_by_user_id(self, user_id: ULID) -> list[Project]:
        raise NotImplementedError

    @abstractmethod
    def get_all_paged_by_user_id(self, user_id: ULID, paging_options: PagingOptions) -> Page[Project]:
        raise NotImplementedError

    @abstractmethod
    def get_partial_ordered_by_created_at(self, user_id: ULID, size: int) -> list[Project]:
        raise NotImplementedError
