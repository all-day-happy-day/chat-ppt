from ulid import ULID

from app.user.domain.entity import User
from app.user.domain.repository import UserRepository


class GetUserUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self, user_id: ULID) -> User:
        return self.user_repository.get_by_id(user_id)
