from ulid import ULID

from app.project.domain.valueobject import Variable
from app.project.infrastructure.repository.variable.entity import VariableAlchemyEntity


class VariableMapper:
    @staticmethod
    def to_alchemy_entity(variable: Variable) -> VariableAlchemyEntity:
        return VariableAlchemyEntity(
            project_id=variable.project_id,
            name=variable.name,
            value=variable.value,
        )

    @staticmethod
    def to_domain_entity(alchemy_entity: VariableAlchemyEntity) -> Variable:
        return Variable(
            project_id=ULID.from_str(alchemy_entity.project_id),
            name=alchemy_entity.name,
            value=alchemy_entity.value,
        )
