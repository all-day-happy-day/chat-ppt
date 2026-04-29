from datetime import timezone

from ulid import ULID

from app.user.domain.entity import User
from app.user.infrastructure.repository.entity import UserAlchemyEntity


class UserMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: UserAlchemyEntity) -> User:
        return User(
            id=ULID.from_str(alchemy_entity.id),
            email=alchemy_entity.email,
            username=alchemy_entity.username,
            created_at=alchemy_entity.created_at.replace(tzinfo=timezone.utc),
            updated_at=alchemy_entity.updated_at.replace(tzinfo=timezone.utc),
            last_sign_in=(
                alchemy_entity.last_sign_in.replace(tzinfo=timezone.utc)
                if alchemy_entity.last_sign_in is not None
                else None
            ),
            role=alchemy_entity.role,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: User) -> UserAlchemyEntity:
        return UserAlchemyEntity(
            id=str(domain_entity.id),
            email=domain_entity.email,
            username=domain_entity.username,
            created_at=domain_entity.created_at,
            updated_at=domain_entity.updated_at,
            last_sign_in=domain_entity.last_sign_in,
            role=domain_entity.role,
        )
