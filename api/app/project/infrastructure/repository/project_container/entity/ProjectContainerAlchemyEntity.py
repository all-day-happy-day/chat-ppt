from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ulid import ULID

from app.project.infrastructure.repository.part.entity import PartAlchemyEntity
from core.db.db import Base


class ProjectContainerAlchemyEntity(Base):
    __tablename__: str = "project-container"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    project_id: Mapped[str] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    container_name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False)

    parts: Mapped[list[PartAlchemyEntity]] = relationship("PartAlchemyEntity", cascade="all, delete-orphan")
