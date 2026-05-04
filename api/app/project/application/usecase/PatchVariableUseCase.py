from ulid import ULID

from app.project.domain.repository import VariableRepository
from app.project.domain.valueobject import Variable


class PatchVariableUseCase:
    def __init__(self, variable_repository: VariableRepository) -> None:
        self.variable_repository: VariableRepository = variable_repository

    def __call__(self, name: str, new_value: str | None, project_id: ULID) -> Variable:
        variable: Variable = self.variable_repository.get_by_name(name=name, project_id=project_id)
        if new_value is not None:
            variable.value = new_value
            return self.variable_repository.save(variable=variable)
        else:
            return variable
