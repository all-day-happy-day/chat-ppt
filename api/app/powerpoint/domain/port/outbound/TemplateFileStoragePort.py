from abc import ABC, abstractmethod
from pathlib import Path


class TemplateFileStoragePort(ABC):
    @abstractmethod
    def save(self, data: bytes, filename: str) -> Path:
        raise NotImplementedError
