from abc import ABC, abstractmethod

from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile


class TemplateFileRepository(ABC):
    @abstractmethod
    def save(self, template_file: TemplateFile) -> TemplateFile:
        raise NotImplementedError

    @abstractmethod
    def get_by_template_id(self, template_id: ULID) -> TemplateFile:
        raise NotImplementedError

    @abstractmethod
    def delete_by_template_id(self, template_id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_all_by_user_id(self, user_id: ULID) -> list[TemplateFile]:
        raise NotImplementedError
