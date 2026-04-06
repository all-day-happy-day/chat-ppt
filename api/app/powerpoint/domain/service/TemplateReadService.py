from abc import ABC, abstractmethod
from pathlib import Path

from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile


class TemplateReadService(ABC):
    @abstractmethod
    def read(
        self, user_id: ULID, ppt_path: str | Path, template_name: str | None = None, template: Template | None = None
    ) -> tuple[TemplateFile, Template]:
        raise NotImplementedError
