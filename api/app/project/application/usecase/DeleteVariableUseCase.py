from ulid import ULID

from app.project.domain.repository import VariableRepository


class DeleteVariableUseCase:
    def __init__(self, variable_repository: VariableRepository) -> None:
        self.variable_repository: VariableRepository = variable_repository

    def __call__(self, name: str, project_id: ULID) -> None:
        self.variable_repository.delete_by_name(name=name, project_id=project_id)
