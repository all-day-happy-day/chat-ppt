from math import ceil

from sqlalchemy import Select, UnaryExpression, func, select
from sqlalchemy.orm import Session
from ulid import ULID

from app.shared.page import Page, PagingOptions
from app.song.domain.entity import Song
from app.song.domain.exception import SongNotFound
from app.song.domain.repository import SongRepository
from app.song.infrastructure.respository.song.entity import SongAlchemyEntity
from app.song.infrastructure.respository.song.mapper import SongMapper


class AlchemySongRepository(SongRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, song: Song) -> Song:
        alchemy_entity: SongAlchemyEntity = self.db.merge(SongMapper.to_alchemy_entity(domain_entity=song))
        self.db.commit()
        self.db.refresh(alchemy_entity)

        return SongMapper.to_domain_entity(alchemy_entity=alchemy_entity)

    def get_by_title(self, title: str) -> list[Song]:
        alchemy_entities: list[SongAlchemyEntity] = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.title == title).all()
        )
        if not alchemy_entities:
            raise SongNotFound(f"Songs not found: {title}")
        return [SongMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def list_all(self) -> list[Song]:
        alchemy_entities: list[SongAlchemyEntity] = (
            self.db.query(SongAlchemyEntity).order_by(SongAlchemyEntity.title.asc(), SongAlchemyEntity.id.asc()).all()
        )
        return [SongMapper.to_domain_entity(alchemy_entity=entity) for entity in alchemy_entities]

    def get_by_title_and_artist(self, title: str, artist: str | None) -> Song:
        alchemy_entity: SongAlchemyEntity | None = (
            self.db
            .query(SongAlchemyEntity)
            .filter(SongAlchemyEntity.title == title, SongAlchemyEntity.artist == artist)
            .first()
        )
        if alchemy_entity is None:
            raise SongNotFound(f"Song not found: {title} {artist}")
        return SongMapper.to_domain_entity(alchemy_entity)

    def get_by_id(self, song_id: ULID) -> Song:
        alchemy_entity: SongAlchemyEntity | None = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise SongNotFound(f"Song not found: {song_id}")
        return SongMapper.to_domain_entity(alchemy_entity)

    def delete_by_id(self, song_id: ULID) -> None:
        alchemy_entity: SongAlchemyEntity | None = (
            self.db.query(SongAlchemyEntity).filter(SongAlchemyEntity.id == str(song_id)).first()
        )
        if alchemy_entity is None:
            raise SongNotFound(f"Song not found: {song_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_paged(self, paging_options: PagingOptions) -> Page[Song]:
        sort_by: UnaryExpression
        if paging_options.sort_by == "name":
            if paging_options.sort_order == "asc":
                sort_by = SongAlchemyEntity.title.asc()
            elif paging_options.sort_order == "desc":
                sort_by = SongAlchemyEntity.title.desc()
            else:
                raise ValueError(f"Invalid sort order: {paging_options.sort_order}")
        else:
            sort_by = SongAlchemyEntity.id.asc()

        stmt: Select[tuple[SongAlchemyEntity]] = (
            select(SongAlchemyEntity)
            .order_by(sort_by)
            .offset((paging_options.page - 1) * paging_options.size)
            .limit(paging_options.size)
        )
        alchemy_entities: list[SongAlchemyEntity] = list(self.db.scalars(stmt).all())
        count_stmt: Select[tuple[int]] = select(func.count()).select_from(SongAlchemyEntity)
        total_items: int = self.db.execute(count_stmt).scalar_one()
        total_pages: int = ceil(total_items / paging_options.size)
        return Page(
            items=[SongMapper.to_domain_entity(entity) for entity in alchemy_entities],
            page=paging_options.page,
            size=paging_options.size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def get_partial_ordered_by_title(self, size: int) -> list[Song]:
        stmt: Select[tuple[SongAlchemyEntity]] = select(SongAlchemyEntity).order_by(SongAlchemyEntity.title.asc())
        alchemy_entities: list[SongAlchemyEntity] = list(self.db.scalars(stmt).fetchmany(size=size))
        return [SongMapper.to_domain_entity(entity) for entity in alchemy_entities]
