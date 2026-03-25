from ulid import ULID

from core.auth.domain.enum import CredentialsType
from core.auth.domain.exception import InvalidCredentials
from core.auth.domain.valueobject import Credentials
from core.auth.infrastructure.repository.credentials.entity import CredentialsAlchemyEntity


class CredentialsMapper:
    @staticmethod
    def to_domain_entity(alchemy_entity: CredentialsAlchemyEntity) -> Credentials:
        if alchemy_entity.access_key is not None:
            return Credentials(
                user_id=ULID.from_str(alchemy_entity.user_id),
                type=CredentialsType.SHORT_LIVED,
                raw_value=alchemy_entity.access_key,
            )
        elif alchemy_entity.refresh_key is not None:
            return Credentials(
                user_id=ULID.from_str(alchemy_entity.user_id),
                type=CredentialsType.LONG_LIVED,
                raw_value=alchemy_entity.refresh_key,
            )
        else:
            raise InvalidCredentials(f"Invalid credentials: {alchemy_entity}")

    @staticmethod
    def to_alchemy_entity(domain_entity: Credentials) -> CredentialsAlchemyEntity:
        if domain_entity.type == CredentialsType.SHORT_LIVED:
            return CredentialsAlchemyEntity(
                user_id=str(domain_entity.user_id),
                access_key=domain_entity.raw_value,
                refresh_key=None,
            )
        elif domain_entity.type == CredentialsType.LONG_LIVED:
            return CredentialsAlchemyEntity(
                user_id=str(domain_entity.user_id),
                refresh_key=domain_entity.raw_value,
                access_key=None,
            )
        else:
            raise InvalidCredentials(f"Invalid credentials type: {domain_entity.type}")
