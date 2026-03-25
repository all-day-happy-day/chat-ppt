from core.auth.domain.service import AuthenticationService
from core.auth.domain.valueobject import Credentials


class RefreshCredentialsUseCase:
    def __init__(self, auth_service: AuthenticationService) -> None:
        self.auth_service: AuthenticationService = auth_service

    def __call__(self, raw_long_lived_credentials: str) -> tuple[Credentials, Credentials]:
        return self.auth_service.refresh(raw_long_lived_credentials=raw_long_lived_credentials)
