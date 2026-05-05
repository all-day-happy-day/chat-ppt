from ulid import ULID

from app.project.domain.repository import VariableRepository
from app.project.domain.valueobject import Variable


class GetAllVariablesUseCase:
    def __init__(self, variable_repository: VariableRepository) -> None:
        self.variable_repository: VariableRepository = variable_repository

    def __call__(self, project_id: ULID) -> list[Variable]:
        return self.variable_repository.get_all(project_id=project_id)
