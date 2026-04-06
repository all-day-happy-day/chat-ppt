from abc import ABC, abstractmethod

from ulid import ULID

from app.powerpoint.domain.entity import Template


class TemplateRepository(ABC):
    @abstractmethod
    def save(self, template: Template) -> Template:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, id: ULID) -> Template:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_all_by_user_id(self, user_id: ULID) -> list[Template]:
        raise NotImplementedError
