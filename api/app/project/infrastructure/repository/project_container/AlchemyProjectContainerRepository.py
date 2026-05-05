from math import ceil

from sqlalchemy import Select, UnaryExpression, func, select
from sqlalchemy.orm import Session
from ulid import ULID

from app.project.domain.entity import ProjectContainer
from app.project.domain.exception import ProjectContainerNotFound
from app.project.domain.repository import ProjectContainerRepository
from app.project.infrastructure.repository.project_container.entity import ProjectContainerAlchemyEntity
from app.project.infrastructure.repository.project_container.mapper import ProjectContainerMapper
from app.shared.page import Page, PagingOptions


class AlchemyProjectContainerRepository(ProjectContainerRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, project_container: ProjectContainer) -> ProjectContainer:
        alchemy_entity: ProjectContainerAlchemyEntity = ProjectContainerMapper.to_alchemy_entity(project_container)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return ProjectContainerMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> ProjectContainer:
        alchemy_entity: ProjectContainerAlchemyEntity | None = (
            self.db.query(ProjectContainerAlchemyEntity).filter(ProjectContainerAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectContainerNotFound(f"Project container not found: {id}")
        return ProjectContainerMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: ProjectContainerAlchemyEntity | None = (
            self.db.query(ProjectContainerAlchemyEntity).filter(ProjectContainerAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectContainerNotFound(f"Project container not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_project_id(self, project_id: ULID) -> list[ProjectContainer]:
        alchemy_entities: list[ProjectContainerAlchemyEntity] = (
            self.db
            .query(ProjectContainerAlchemyEntity)
            .filter(ProjectContainerAlchemyEntity.project_id == str(project_id))
            .all()
        )
        return [ProjectContainerMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def get_all_paged_by_project_id(self, project_id: ULID, paging_options: PagingOptions) -> Page[ProjectContainer]:
        sort_by: UnaryExpression
        if paging_options.sort_by == "created_at":
            if paging_options.sort_order == "asc":
                sort_by = ProjectContainerAlchemyEntity.created_at.asc()
            elif paging_options.sort_order == "desc":
                sort_by = ProjectContainerAlchemyEntity.created_at.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        elif paging_options.sort_by == "name":
            if paging_options.sort_order == "asc":
                sort_by = ProjectContainerAlchemyEntity.container_name.asc()
            elif paging_options.sort_order == "desc":
                sort_by = ProjectContainerAlchemyEntity.container_name.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        else:
            sort_by = ProjectContainerAlchemyEntity.id.asc()

        stmt: Select[tuple[ProjectContainerAlchemyEntity]] = (
            select(ProjectContainerAlchemyEntity)
            .where(ProjectContainerAlchemyEntity.project_id == str(project_id))
            .order_by(sort_by)
            .offset((paging_options.page - 1) * paging_options.size)
            .limit(paging_options.size)
        )
        alchemy_entities: list[ProjectContainerAlchemyEntity] = list(self.db.scalars(stmt).all())
        count_stmt: Select[tuple[int]] = (
            select(func.count())
            .select_from(ProjectContainerAlchemyEntity)
            .where(ProjectContainerAlchemyEntity.project_id == str(project_id))
        )
        total_items: int = self.db.execute(count_stmt).scalar_one()
        total_pages: int = ceil(total_items / paging_options.size)
        return Page(
            items=[ProjectContainerMapper.to_domain_entity(entity) for entity in alchemy_entities],
            page=paging_options.page,
            size=paging_options.size,
            total_items=total_items,
            total_pages=total_pages,
        )
