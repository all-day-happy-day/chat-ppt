from math import ceil

from sqlalchemy import Select, UnaryExpression, func, select
from sqlalchemy.orm import Session
from ulid import ULID

from app.project.domain.entity import Project
from app.project.domain.exception import ProjectNotFound
from app.project.domain.repository import ProjectRepository
from app.project.infrastructure.repository.project.entity import ProjectAlchemyEntity
from app.project.infrastructure.repository.project.mapper import ProjectMapper
from app.shared.page import Page, PagingOptions


class AlchemyProjectRepository(ProjectRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, project: Project) -> Project:
        alchemy_entity: ProjectAlchemyEntity = ProjectMapper.to_alchemy_entity(project)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return ProjectMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, id: ULID) -> Project:
        alchemy_entity: ProjectAlchemyEntity | None = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectNotFound(f"Project not found: {id}")
        return ProjectMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, id: ULID) -> None:
        alchemy_entity: ProjectAlchemyEntity | None = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.id == str(id)).first()
        )
        if alchemy_entity is None:
            raise ProjectNotFound(f"Project not found: {id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_user_id(self, user_id: ULID) -> list[Project]:
        alchemy_entities: list[ProjectAlchemyEntity] = (
            self.db.query(ProjectAlchemyEntity).filter(ProjectAlchemyEntity.user_id == str(user_id)).all()
        )
        return [ProjectMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def get_all_paged_by_user_id(self, user_id: ULID, paging_options: PagingOptions) -> Page[Project]:
        sort_by: UnaryExpression
        if paging_options.sort_by == "created_at":
            if paging_options.sort_order == "asc":
                sort_by = ProjectAlchemyEntity.created_at.asc()
            elif paging_options.sort_order == "desc":
                sort_by = ProjectAlchemyEntity.created_at.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        elif paging_options.sort_by == "name":
            if paging_options.sort_order == "asc":
                sort_by = ProjectAlchemyEntity.name.asc()
            elif paging_options.sort_order == "desc":
                sort_by = ProjectAlchemyEntity.name.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        else:
            sort_by = ProjectAlchemyEntity.id.asc()

        stmt: Select[tuple[ProjectAlchemyEntity]] = (
            select(ProjectAlchemyEntity)
            .where(ProjectAlchemyEntity.user_id == str(user_id))
            .order_by(sort_by)
            .offset((paging_options.page - 1) * paging_options.size)
            .limit(paging_options.size)
        )
        alchemy_entities: list[ProjectAlchemyEntity] = list(self.db.scalars(stmt).all())
        count_stmt: Select[tuple[int]] = (
            select(func.count()).select_from(ProjectAlchemyEntity).where(ProjectAlchemyEntity.user_id == str(user_id))
        )
        total_items: int = self.db.execute(count_stmt).scalar_one()
        total_pages: int = ceil(total_items / paging_options.size)
        return Page(
            items=[ProjectMapper.to_domain_entity(entity) for entity in alchemy_entities],
            page=paging_options.page,
            size=paging_options.size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def get_partial_ordered_by_created_at(self, user_id: ULID, size: int) -> list[Project]:
        stmt: Select[tuple[ProjectAlchemyEntity]] = (
            select(ProjectAlchemyEntity)
            .where(ProjectAlchemyEntity.user_id == str(user_id))
            .order_by(ProjectAlchemyEntity.created_at.desc())
        )
        alchemy_entities: list[ProjectAlchemyEntity] = list(self.db.scalars(stmt).fetchmany(size=size))
        return [ProjectMapper.to_domain_entity(entity) for entity in alchemy_entities]
