from abc import ABC, abstractmethod

from ulid import ULID

from app.user.domain.entity import User


class UserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> User:
        pass

    @abstractmethod
    def patch(self, user: User) -> User:
        pass

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        pass

    @abstractmethod
    def get_by_id(self, id: ULID) -> User:
        pass

    @abstractmethod
    def get(self) -> list[User]:
        pass
