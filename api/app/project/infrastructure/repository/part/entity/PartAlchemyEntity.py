from sqlalchemy import JSON, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

from app.project.domain.enum import PartType
from core.db.db import Base


class PartAlchemyEntity(Base):
    __tablename__: str = "project-part"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, unique=True, default=lambda: str(ULID()))
    project_id: Mapped[str] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True)
    container_id: Mapped[str | None] = mapped_column(
        ForeignKey("project-container.id", ondelete="CASCADE"), nullable=True, index=True
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[PartType] = mapped_column(Enum(PartType), nullable=False)
    contents: Mapped[dict] = mapped_column(JSON, nullable=False)
    additional_data: Mapped[dict] = mapped_column(JSON, nullable=False)
