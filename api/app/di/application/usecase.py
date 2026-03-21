from fastapi import Depends

from app.di.domain.repository import get_user_repository
from app.user.application.usecase import (
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
)
from app.user.domain.repository import UserRepository


# User
def get_create_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> CreateUserUseCase:
    return CreateUserUseCase(user_repository=user_repository)


def get_delete_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> DeleteUserUseCase:
    return DeleteUserUseCase(user_repository=user_repository)


def get_get_users_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> GetUsersUseCase:
    return GetUsersUseCase(user_repository=user_repository)


def get_get_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> GetUserUseCase:
    return GetUserUseCase(user_repository=user_repository)


def get_update_user_use_case(user_repository: UserRepository = Depends(get_user_repository)) -> UpdateUserUseCase:
    return UpdateUserUseCase(user_repository=user_repository)
