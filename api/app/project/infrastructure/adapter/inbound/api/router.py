from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from ulid import ULID

from app.di.application.usecase import (
    get_create_project_container_use_case,
    get_create_project_use_case,
    get_delete_project_container_use_case,
    get_delete_project_use_case,
    get_get_project_containers_use_case,
    get_get_projects_use_case,
    get_patch_project_container_use_case,
    get_patch_project_use_case,
)
from app.project.application.usecase import (
    CreateProjectContainerUseCase,
    CreateProjectUseCase,
    DeleteProjectContainerUseCase,
    DeleteProjectUseCase,
    GetProjectContainersUseCase,
    GetProjectsUseCase,
    PatchProjectContainerUseCase,
    PatchProjectUseCase,
)
from app.project.domain.entity import Project, ProjectContainer
from app.project.domain.exception import ProjectContainerNotFound, ProjectNotFound
from app.project.infrastructure.adapter.inbound.api.message import (
    CreateProjectContainerRequest,
    CreateProjectContainerResponse,
    CreateProjectRequest,
    CreateProjectResponse,
    GetProjectContainerResponse,
    GetProjectResponse,
    PatchProjectContainerRequest,
    PatchProjectContainerResponse,
    PatchProjectRequest,
    PatchProjectResponse,
)

router: APIRouter = APIRouter(tags=["Project"])


# Project
@router.get("/project/{user_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectResponse])
def get_projects(user_id: ULID, usecase: Annotated[GetProjectsUseCase, Depends(get_get_projects_use_case)]):
    projects: list[Project] = usecase(user_id=user_id)
    return [GetProjectResponse.from_domain_entity(project) for project in projects]


@router.post("/project", status_code=status.HTTP_201_CREATED, response_model=CreateProjectResponse)
def create_project(
    request_model: CreateProjectRequest, usecase: Annotated[CreateProjectUseCase, Depends(get_create_project_use_case)]
):
    project: Project = usecase(
        template_id=request_model.template_id,
        user_id=request_model.user_id,
        name=request_model.name,
    )
    return CreateProjectResponse.from_domain_entity(project)


@router.patch("/project/{project_id}", status_code=status.HTTP_200_OK, response_model=PatchProjectResponse)
def patch_project(
    project_id: ULID,
    request_model: PatchProjectRequest,
    usecase: Annotated[PatchProjectUseCase, Depends(get_patch_project_use_case)],
):
    project: Project = usecase(
        project_id=project_id,
        name=request_model.name,
        parts=request_model.parts,
    )
    return PatchProjectResponse.from_domain_entity(project)


@router.delete("/project/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: ULID, usecase: Annotated[DeleteProjectUseCase, Depends(get_delete_project_use_case)]):
    try:
        usecase(project_id=project_id)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Project Container
@router.get(
    "/project/container/{project_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectContainerResponse]
)
def get_project_containers(
    project_id: ULID, usecase: Annotated[GetProjectContainersUseCase, Depends(get_get_project_containers_use_case)]
):
    project_containers: list[ProjectContainer] = usecase(project_id=project_id)
    return [
        GetProjectContainerResponse.from_domain_entity(project_container) for project_container in project_containers
    ]


@router.post("/project/container", status_code=status.HTTP_201_CREATED, response_model=CreateProjectContainerResponse)
def create_project_container(
    request_model: CreateProjectContainerRequest,
    usecase: Annotated[CreateProjectContainerUseCase, Depends(get_create_project_container_use_case)],
):
    project_container: ProjectContainer = usecase(
        project_id=request_model.project_id,
        user_id=request_model.user_id,
        container_name=request_model.container_name,
    )
    return CreateProjectContainerResponse.from_domain_entity(project_container)


@router.patch(
    "/project/container/{project_container_id}",
    status_code=status.HTTP_200_OK,
    response_model=PatchProjectContainerResponse,
)
def patch_project_container(
    project_container_id: ULID,
    request_model: PatchProjectContainerRequest,
    usecase: Annotated[PatchProjectContainerUseCase, Depends(get_patch_project_container_use_case)],
):
    project_container: ProjectContainer = usecase(
        project_container_id=project_container_id,
        container_name=request_model.container_name,
        completed=request_model.completed,
        parts=request_model.parts,
    )
    return PatchProjectContainerResponse.from_domain_entity(project_container)


@router.delete("/project/container/{project_container_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_container(
    project_container_id: ULID,
    usecase: Annotated[DeleteProjectContainerUseCase, Depends(get_delete_project_container_use_case)],
):
    try:
        usecase(project_container_id=project_container_id)
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
