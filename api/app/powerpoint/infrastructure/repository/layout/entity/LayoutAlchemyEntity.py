from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ulid import ULID

from app.powerpoint.infrastructure.repository.shape.entity import ShapeAlchemyEntity
from core.db.db import Base


class LayoutAlchemyEntity(Base):
    __tablename__: str = "ppt-layout"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    template_id: Mapped[str] = mapped_column(ForeignKey("ppt-template.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    background_color: Mapped[str] = mapped_column(JSON, nullable=False)
    shapes: Mapped[list[ShapeAlchemyEntity]] = relationship("ShapeAlchemyEntity", cascade="all, delete-orphan")
