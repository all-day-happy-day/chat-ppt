from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ulid import ULID

from app.project.infrastructure.repository.part.entity import PartAlchemyEntity
from core.db.db import Base


class ProjectAlchemyEntity(Base):
    __tablename__: str = "project"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    template_id: Mapped[str] = mapped_column(
        ForeignKey("ppt-template.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    parts: Mapped[list[PartAlchemyEntity]] = relationship(
        "PartAlchemyEntity",
        cascade="all, delete-orphan",
        primaryjoin=(
            "and_(PartAlchemyEntity.project_id == ProjectAlchemyEntity.id, PartAlchemyEntity.container_id.is_(None))"
        ),
        foreign_keys=[PartAlchemyEntity.project_id],
    )
