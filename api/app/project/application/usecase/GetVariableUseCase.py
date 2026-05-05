from ulid import ULID

from app.project.domain.repository import VariableRepository
from app.project.domain.valueobject import Variable


class GetVariableUseCase:
    def __init__(self, variable_repository: VariableRepository) -> None:
        self.variable_repository: VariableRepository = variable_repository

    def __call__(self, name: str, project_id: ULID) -> Variable:
        return self.variable_repository.get_by_name(name=name, project_id=project_id)
