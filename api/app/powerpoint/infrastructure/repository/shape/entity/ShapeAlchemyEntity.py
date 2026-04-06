from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

from app.powerpoint.domain.enum import ShapeType
from core.db.db import Base


class ShapeAlchemyEntity(Base):
    __tablename__: str = "ppt-shape"
    __table_args__ = (UniqueConstraint("layout_id", "shape_id", name="uq_ppt_shape_layout_shape"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    layout_id: Mapped[str] = mapped_column(ForeignKey("ppt-layout.id", ondelete="CASCADE"), nullable=False, index=True)
    shape_id: Mapped[int] = mapped_column(Integer, nullable=False)
    size: Mapped[str] = mapped_column(JSON, nullable=False)
    position: Mapped[str] = mapped_column(JSON, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(String(255), nullable=True)
    placeholder: Mapped[bool] = mapped_column(Boolean, nullable=False)
    type: Mapped[ShapeType] = mapped_column(Enum(ShapeType), nullable=False)
    fill_color: Mapped[str] = mapped_column(JSON, nullable=False)
