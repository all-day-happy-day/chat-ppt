from pydantic import EmailStr
from sqlalchemy.orm import Session
from ulid import ULID

from app.shared.user.domain.exception import DuplicatedUser
from app.user.domain.entity import User
from app.user.domain.exception import UserNotFound
from app.user.domain.repository import UserRepository
from app.user.infrastructure.repository.entity import UserAlchemyEntity
from app.user.infrastructure.repository.mapper import UserMapper


class AlchemyUserRepository(UserRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db

    def save(self, user: User) -> User:
        if self.get_by_username(username=user.username) is not None or self.get_by_email(email=user.email) is not None:
            raise DuplicatedUser(f"User already exists: {user.username} or {user.email}")
        alchemy_entity: UserAlchemyEntity = UserMapper.to_alchemy_entity(user)
        self.db.add(alchemy_entity)
        self.db.commit()
        return user

    def patch(self, user: User) -> User:
        alchemy_entity: UserAlchemyEntity = UserMapper.to_alchemy_entity(user)
        merged_entity: UserAlchemyEntity = self.db.merge(alchemy_entity)
        self.db.commit()
        self.db.refresh(merged_entity)
        return UserMapper.to_domain_entity(merged_entity)

    def delete_by_id(self, user_id: ULID) -> None:
        alchemy_entity: UserAlchemyEntity | None = (
            self.db.query(UserAlchemyEntity).filter(UserAlchemyEntity.id == str(user_id)).first()
        )
        if alchemy_entity is None:
            raise UserNotFound(f"User not found: {user_id}")
        self.db.delete(alchemy_entity)
        self.db.commit()

    def get_by_id(self, user_id: ULID) -> User:
        alchemy_entity: UserAlchemyEntity | None = (
            self.db.query(UserAlchemyEntity).filter(UserAlchemyEntity.id == str(user_id)).first()
        )
        if alchemy_entity is None:
            raise UserNotFound(f"User not found: {user_id}")
        return UserMapper.to_domain_entity(alchemy_entity)

    def get(self) -> list[User]:
        alchemy_entities: list[UserAlchemyEntity] = self.db.query(UserAlchemyEntity).all()
        return [UserMapper.to_domain_entity(entity) for entity in alchemy_entities]

    def get_by_email(self, email: EmailStr) -> User:
        alchemy_entity: UserAlchemyEntity | None = (
            self.db.query(UserAlchemyEntity).filter(UserAlchemyEntity.email == email).first()
        )
        if alchemy_entity is None:
            raise UserNotFound(f"User not found: {email}")
        return UserMapper.to_domain_entity(alchemy_entity)

    def get_by_username(self, username: str) -> User:
        alchemy_entity: UserAlchemyEntity | None = (
            self.db.query(UserAlchemyEntity).filter(UserAlchemyEntity.username == username).first()
        )
        if alchemy_entity is None:
            raise UserNotFound(f"User not found: {username}")
        return UserMapper.to_domain_entity(alchemy_entity)
