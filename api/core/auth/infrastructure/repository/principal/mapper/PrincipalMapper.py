from ulid import ULID

from core.auth.domain.entity import Principal
from core.auth.infrastructure.repository.principal.entity import PrincipalAlchemyEntity


class PrincipalMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: PrincipalAlchemyEntity) -> Principal:
        return Principal(
            id=ULID.from_str(alchemy_entity.id),
            user_id=ULID.from_str(alchemy_entity.user_id),
            principal=alchemy_entity.principal,
            password_hashed=alchemy_entity.password_hashed,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Principal) -> PrincipalAlchemyEntity:
        return PrincipalAlchemyEntity(
            id=str(domain_entity.id),
            user_id=str(domain_entity.user_id),
            principal=domain_entity.principal,
            password_hashed=domain_entity.password_hashed,
        )
