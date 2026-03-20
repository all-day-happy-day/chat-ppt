from ulid import ULID

from app.user.domain.repository import UserRepository


class DeleteUserUseCase:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository: UserRepository = user_repository

    def __call__(self, user_id: ULID) -> None:
        return self.user_repository.delete_by_id(user_id)
