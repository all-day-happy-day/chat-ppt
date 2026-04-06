from abc import ABC, abstractmethod

from ulid import ULID

from app.powerpoint.domain.entity import Shape


class ShapeRepository(ABC):
    @abstractmethod
    def save(self, shape: Shape) -> Shape:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, id: ULID) -> Shape:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError
