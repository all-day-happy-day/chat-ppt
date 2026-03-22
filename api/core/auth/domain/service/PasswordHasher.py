from abc import ABC, abstractmethod


class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, password: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def verify(self, plain: str, hashed: str) -> bool:
        raise NotImplementedError
