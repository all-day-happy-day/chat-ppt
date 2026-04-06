from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db.db import Base


class TemplateFileAlchemyEntity(Base):
    __tablename__: str = "ppt-template-file"

    template_id: Mapped[str] = mapped_column(String(36), nullable=False, primary_key=True, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
