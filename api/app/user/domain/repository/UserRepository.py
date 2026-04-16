from abc import ABC, abstractmethod

from pydantic import EmailStr
from ulid import ULID

from app.user.domain.entity import User


class UserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def patch(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, id: ULID) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: ULID) -> User:
        raise NotImplementedError

    @abstractmethod
    def get(self) -> list[User]:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: EmailStr) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_by_username(self, username: str) -> User:
        raise NotImplementedError
