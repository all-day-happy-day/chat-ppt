from ulid import ULID

from core.auth.domain.valueobject import Credentials
from core.auth.infrastructure.repository.credentials.entity import CredentialsAlchemyEntity


class CredentialsMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: CredentialsAlchemyEntity) -> Credentials:
        return Credentials(
            user_id=ULID.from_str(alchemy_entity.user_id),
            type=alchemy_entity.type,
            raw_value=alchemy_entity.raw_value,
        )

    @staticmethod
    def to_alchemy_entity(domain_entity: Credentials) -> CredentialsAlchemyEntity:
        return CredentialsAlchemyEntity(
            user_id=str(domain_entity.user_id),
            type=domain_entity.type,
            raw_value=domain_entity.raw_value,
        )
