from abc import ABC, abstractmethod

from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile
from app.shared.page import Page, PagingOptions


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

    @abstractmethod
    def get_all_paged_by_user_id(self, user_id: ULID, paging_options: PagingOptions) -> Page[TemplateFile]:
        raise NotImplementedError

    @abstractmethod
    def get_partial_ordered_by_created_at(self, user_id: ULID, size: int) -> list[TemplateFile]:
        raise NotImplementedError
