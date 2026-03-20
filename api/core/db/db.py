from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.orm import Session as SQLAlchemySession

from .config import db_config

engine: Engine = create_engine(
    url=db_config.url,
    connect_args={},
    pool_size=db_config.pool_size,
    max_overflow=db_config.max_overflow,
)
Session: sessionmaker[SQLAlchemySession] = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[SQLAlchemySession]:
    db: SQLAlchemySession = Session()

    try:
        yield db
    finally:
        db.close()
