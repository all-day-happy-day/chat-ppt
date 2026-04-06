from abc import ABC, abstractmethod
from pathlib import Path

from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile


class TemplateFileStoragePort(ABC):
    @abstractmethod
    def save(self, data: bytes, filename: str, user_id: ULID) -> Path:
        raise NotImplementedError

    @abstractmethod
    def delete(self, template_file: TemplateFile) -> None:
        raise NotImplementedError
