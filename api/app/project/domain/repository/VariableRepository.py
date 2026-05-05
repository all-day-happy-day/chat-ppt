from abc import ABC, abstractmethod

from ulid import ULID

from app.project.domain.valueobject import Variable


class VariableRepository(ABC):
    @abstractmethod
    def save(self, variable: Variable) -> Variable:
        raise NotImplementedError

    @abstractmethod
    def patch(self, variable: Variable) -> Variable:
        raise NotImplementedError

    @abstractmethod
    def get_all(self, project_id: ULID) -> list[Variable]:
        raise NotImplementedError

    @abstractmethod
    def get_by_name(self, name: str, project_id: ULID) -> Variable:
        raise NotImplementedError

    @abstractmethod
    def delete_by_name(self, name: str, project_id: ULID) -> None:
        raise NotImplementedError
