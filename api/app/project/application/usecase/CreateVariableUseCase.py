from ulid import ULID

from app.project.domain.repository import VariableRepository
from app.project.domain.valueobject import Variable


class CreateVariableUseCase:
    def __init__(self, variable_repository: VariableRepository) -> None:
        self.variable_repository: VariableRepository = variable_repository

    def __call__(self, project_id: ULID, name: str, value: str) -> Variable:
        self.variable_repository.get_by_name(name=name, project_id=project_id)
        variable: Variable = Variable(project_id=project_id, name=name, value=value)
        return self.variable_repository.save(variable=variable)
