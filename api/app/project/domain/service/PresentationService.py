from abc import ABC, abstractmethod
from pathlib import Path

from ulid import ULID

from app.project.domain.types import Parts


class PresentationService(ABC):
    @abstractmethod
    def generate_and_save(
        self,
        template_file_path: str | Path,
        parts: list[Parts],
        save_ppt_filename: str,
        project_id: ULID,
        user_id: ULID,
    ) -> Path:
        raise NotImplementedError
