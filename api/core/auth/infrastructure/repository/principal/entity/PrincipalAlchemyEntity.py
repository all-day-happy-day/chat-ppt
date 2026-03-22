from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

from core.db.db import Base


class PrincipalAlchemyEntity(Base):
    __tablename__ = "principal"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(ULID()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    principal: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    password_hashed: Mapped[str] = mapped_column(String(64), nullable=False)
