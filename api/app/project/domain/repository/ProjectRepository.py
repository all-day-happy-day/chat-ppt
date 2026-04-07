from abc import ABC, abstractmethod

from ulid import ULID

from app.project.domain.entity import Project


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
