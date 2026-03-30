from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from core.db.db import Base


class SongAlchemyEntity(Base):
    __tablename__: str = "song"

    id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, primary_key=True, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    artist: Mapped[str] = mapped_column(String(255), nullable=True)
