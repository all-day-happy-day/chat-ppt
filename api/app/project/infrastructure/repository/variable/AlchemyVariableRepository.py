from sqlalchemy import Result, Select, select
from sqlalchemy.orm import Session
from ulid import ULID

from app.project.domain.exception import DuplicatedVariable, VariableNotFound
from app.project.domain.repository import VariableRepository
from app.project.domain.valueobject import Variable
from app.project.infrastructure.repository.variable.entity import VariableAlchemyEntity
from app.project.infrastructure.repository.variable.mapper import VariableMapper


class AlchemyVariableRepository(VariableRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, variable: Variable) -> Variable:
        stmt: Select = select(VariableAlchemyEntity).filter(
            VariableAlchemyEntity.name == variable.name, VariableAlchemyEntity.project_id == str(variable.project_id)
        )
        alchemy_entity: VariableAlchemyEntity | None = self.db.execute(stmt).scalars().first()
        if alchemy_entity is not None:
            raise DuplicatedVariable(f"Variable already exists: {variable.name} {variable.project_id}")

        alchemy_entity = VariableMapper.to_alchemy_entity(variable)
        self.db.add(alchemy_entity)
        self.db.commit()
        return VariableMapper.to_domain_entity(alchemy_entity)

    def patch(self, variable: Variable) -> Variable:
        alchemy_entity: VariableAlchemyEntity = VariableMapper.to_alchemy_entity(variable)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return VariableMapper.to_domain_entity(alchemy_entity)

    def get_all(self, project_id: ULID) -> list[Variable]:
        stmt: Select = select(VariableAlchemyEntity).filter(VariableAlchemyEntity.project_id == str(project_id))
        result: Result = self.db.execute(stmt)
        return [VariableMapper.to_domain_entity(entity) for entity in result.scalars().all()]

    def get_by_name(self, name: str, project_id: ULID) -> Variable:
        stmt: Select = select(VariableAlchemyEntity).filter(
            VariableAlchemyEntity.name == name, VariableAlchemyEntity.project_id == str(project_id)
        )
        result: Result = self.db.execute(stmt)
        alchemy_entity: VariableAlchemyEntity | None = result.scalars().first()
        if alchemy_entity is None:
            raise VariableNotFound(f"Variable not found: {name} {project_id}")
        return VariableMapper.to_domain_entity(alchemy_entity)

    def delete_by_name(self, name: str, project_id: ULID) -> None:
        stmt: Select = select(VariableAlchemyEntity).filter(
            VariableAlchemyEntity.name == name, VariableAlchemyEntity.project_id == str(project_id)
        )
        result: Result = self.db.execute(stmt)
        alchemy_entity: VariableAlchemyEntity | None = result.scalars().first()
        if alchemy_entity is None:
            raise VariableNotFound(f"Variable not found: {name} {project_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()
