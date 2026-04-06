from datetime import datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ulid import ULID

from app.powerpoint.infrastructure.repository.layout.entity import LayoutAlchemyEntity
from core.db.db import Base


class TemplateAlchemyEntity(Base):
    __tablename__: str = "ppt-template"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    slide_size: Mapped[str] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    layouts: Mapped[list[LayoutAlchemyEntity]] = relationship("LayoutAlchemyEntity", cascade="all, delete-orphan")
