from math import ceil

from sqlalchemy import Select, UnaryExpression, func, select
from sqlalchemy.orm import Session
from ulid import ULID

from app.powerpoint.domain.entity import TemplateFile
from app.powerpoint.domain.exception import TemplateFileNotFound
from app.powerpoint.domain.repository import TemplateFileRepository
from app.powerpoint.infrastructure.repository.template.entity import TemplateAlchemyEntity
from app.powerpoint.infrastructure.repository.template_file.entity import TemplateFileAlchemyEntity
from app.powerpoint.infrastructure.repository.template_file.mapper import TemplateFileMapper
from app.shared.page import Page, PagingOptions


class AlchemyTemplateFileRepository(TemplateFileRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, template_file: TemplateFile) -> TemplateFile:
        alchemy_entity: TemplateFileAlchemyEntity = TemplateFileMapper.to_alchemy_entity(template_file)
        alchemy_entity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(alchemy_entity)
        return TemplateFileMapper.to_domain_entity(alchemy_entity)

    def get_by_template_id(self, template_id: ULID) -> TemplateFile:
        alchemy_entity: TemplateFileAlchemyEntity | None = (
            self.db
            .query(TemplateFileAlchemyEntity)
            .filter(TemplateFileAlchemyEntity.template_id == str(template_id))
            .first()
        )
        if alchemy_entity is None:
            raise TemplateFileNotFound(f"Template file not found: {template_id}")
        return TemplateFileMapper.to_domain_entity(alchemy_entity)

    def delete_by_template_id(self, template_id: ULID) -> None:
        alchemy_entity: TemplateFileAlchemyEntity | None = (
            self.db
            .query(TemplateFileAlchemyEntity)
            .filter(TemplateFileAlchemyEntity.template_id == str(template_id))
            .first()
        )
        if alchemy_entity is None:
            raise TemplateFileNotFound(f"Template file not found: {template_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_all_by_user_id(self, user_id: ULID) -> list[TemplateFile]:
        alchemy_entities: list[TemplateFileAlchemyEntity] = (
            self.db.query(TemplateFileAlchemyEntity).filter(TemplateFileAlchemyEntity.user_id == str(user_id)).all()
        )
        return [TemplateFileMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def get_all_paged_by_user_id(self, user_id: ULID, paging_options: PagingOptions) -> Page[TemplateFile]:
        sort_by: UnaryExpression
        if paging_options.sort_by == "created_at":
            if paging_options.sort_order == "asc":
                sort_by = TemplateAlchemyEntity.created_at.asc()
            elif paging_options.sort_order == "desc":
                sort_by = TemplateAlchemyEntity.created_at.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        elif paging_options.sort_by == "name":
            if paging_options.sort_order == "asc":
                sort_by = TemplateAlchemyEntity.name.asc()
            elif paging_options.sort_order == "desc":
                sort_by = TemplateAlchemyEntity.name.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        else:
            sort_by = TemplateAlchemyEntity.id.asc()

        stmt: Select[tuple[TemplateFileAlchemyEntity]] = (
            select(TemplateFileAlchemyEntity)
            .join(
                TemplateAlchemyEntity,
                TemplateAlchemyEntity.id == TemplateFileAlchemyEntity.template_id,
            )
            .where(TemplateFileAlchemyEntity.user_id == str(user_id))
            .order_by(sort_by)
            .offset((paging_options.page - 1) * paging_options.size)
            .limit(paging_options.size)
        )
        alchemy_entities: list[TemplateFileAlchemyEntity] = list(self.db.scalars(stmt).all())

        count_stmt: Select[tuple[int]] = (
            select(func.count())
            .select_from(TemplateFileAlchemyEntity)
            .where(TemplateFileAlchemyEntity.user_id == str(user_id))
        )
        total_items: int = self.db.execute(count_stmt).scalar_one()
        total_pages: int = ceil(total_items / paging_options.size)

        return Page(
            items=[TemplateFileMapper.to_domain_entity(entity) for entity in alchemy_entities],
            page=paging_options.page,
            size=paging_options.size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def get_partial_ordered_by_created_at(self, user_id: ULID, size: int) -> list[TemplateFile]:
        stmt: Select[tuple[TemplateFileAlchemyEntity]] = (
            select(TemplateFileAlchemyEntity)
            .join(
                TemplateAlchemyEntity,
                TemplateAlchemyEntity.id == TemplateFileAlchemyEntity.template_id,
            )
            .where(TemplateFileAlchemyEntity.user_id == str(user_id))
            .order_by(TemplateAlchemyEntity.created_at.desc())
        )
        alchemy_entities: list[TemplateFileAlchemyEntity] = list(self.db.scalars(stmt).fetchmany(size=size))
        return [TemplateFileMapper.to_domain_entity(entity) for entity in alchemy_entities]
