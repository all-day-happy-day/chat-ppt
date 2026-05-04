from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db.db import Base


class VariableAlchemyEntity(Base):
    __tablename__: str = "project-variable"

    project_id: Mapped[str] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True, primary_key=True)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
