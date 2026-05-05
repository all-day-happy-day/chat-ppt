from abc import ABC, abstractmethod
from pathlib import Path

from pptx.presentation import Presentation
from pptx.slide import SlideLayout
from ulid import ULID

from app.powerpoint.domain.entity import Template, TemplateFile


class TemplateReadService(ABC):
    @abstractmethod
    def _get_template_slide_layouts(self, ppt: Presentation) -> list[SlideLayout]:  # Unlawful
        raise NotImplementedError

    @abstractmethod
    def read(
        self, user_id: ULID, ppt_path: str | Path, template_name: str | None = None, template: Template | None = None
    ) -> tuple[TemplateFile, Template]:
        raise NotImplementedError
