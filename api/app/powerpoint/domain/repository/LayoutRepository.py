from abc import ABC, abstractmethod

from ulid import ULID

from app.powerpoint.domain.entity import Layout


class LayoutRepository(ABC):
    @abstractmethod
    def save(self, layout: Layout) -> Layout:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, id: ULID) -> Layout:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError
