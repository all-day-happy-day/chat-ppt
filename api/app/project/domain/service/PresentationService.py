from abc import ABC, abstractmethod
from pathlib import Path

from app.project.domain.types import Parts


class PresentationService(ABC):
    @abstractmethod
    def create_and_save(self, template_file_path: str | Path, parts: list[Parts], save_path: str | Path) -> Path:
        raise NotImplementedError
