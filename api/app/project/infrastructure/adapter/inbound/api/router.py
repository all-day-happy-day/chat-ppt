from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from ulid import ULID

from app.di.application.usecase import (
    get_create_project_container_use_case,
    get_create_project_use_case,
    get_delete_project_container_use_case,
    get_delete_project_use_case,
    get_export_ppt_use_case,
    get_get_paged_projects_use_case,
    get_get_partial_projects_use_case,
    get_get_project_containers_use_case,
    get_get_projects_use_case,
    get_patch_project_container_use_case,
    get_patch_project_use_case,
)
from app.project.application.command import PatchProjectCommand, PatchProjectContainerCommand
from app.project.application.usecase import (
    CreateProjectContainerUseCase,
    CreateProjectUseCase,
    DeleteProjectContainerUseCase,
    DeleteProjectUseCase,
    ExportPPTUseCase,
    GetPagedProjectsUseCase,
    GetPartialProjectsUseCase,
    GetProjectContainersUseCase,
    GetProjectsUseCase,
    PatchProjectContainerUseCase,
    PatchProjectUseCase,
)
from app.project.domain.entity import Project, ProjectContainer
from app.project.domain.exception import (
    ProjectContainerNotCompleted,
    ProjectContainerNotFound,
    ProjectNotFound,
)
from app.project.infrastructure.adapter.inbound.api.message import (
    CreateProjectContainerRequest,
    CreateProjectContainerResponse,
    CreateProjectRequest,
    CreateProjectResponse,
    ExportPPTRequest,
    ExportPPTResponse,
    GetProjectContainerResponse,
    GetProjectResponse,
    PatchProjectContainerRequest,
    PatchProjectContainerResponse,
    PatchProjectRequest,
    PatchProjectResponse,
)
from app.shared.page import Page, PagingOptions
from app.shared.song.domain.exception import DuplicatedPartName

router: APIRouter = APIRouter(tags=["Project"])


# Project
@router.get("/{user_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectResponse])
def get_projects(user_id: ULID, usecase: Annotated[GetProjectsUseCase, Depends(get_get_projects_use_case)]):
    projects: list[Project] = usecase(user_id=user_id)
    return [GetProjectResponse.from_domain_entity(project) for project in projects]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CreateProjectResponse)
def create_project(
    request_model: CreateProjectRequest, usecase: Annotated[CreateProjectUseCase, Depends(get_create_project_use_case)]
):
    project: Project = usecase(
        template_id=request_model.template_id,
        user_id=request_model.user_id,
        name=request_model.name,
    )
    return CreateProjectResponse.from_domain_entity(project)


@router.patch("/{project_id}", status_code=status.HTTP_200_OK, response_model=PatchProjectResponse)
def patch_project(
    project_id: ULID,
    request_model: PatchProjectRequest,
    usecase: Annotated[PatchProjectUseCase, Depends(get_patch_project_use_case)],
):
    try:
        command: PatchProjectCommand = PatchProjectCommand.model_validate(request_model.model_dump(mode="json"))
        project: Project = usecase(project_id=project_id, command=command)
        return PatchProjectResponse.from_domain_entity(project)
    except DuplicatedPartName as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: ULID, usecase: Annotated[DeleteProjectUseCase, Depends(get_delete_project_use_case)]):
    try:
        usecase(project_id=project_id)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{user_id}/page", status_code=status.HTTP_200_OK, response_model=Page[GetProjectResponse])
def get_paged_projects(
    user_id: ULID,
    paging_options: Annotated[PagingOptions, Depends()],
    usecase: Annotated[GetPagedProjectsUseCase, Depends(get_get_paged_projects_use_case)],
):
    projects: Page[Project] = usecase(user_id=user_id, paging_options=paging_options)
    return Page(
        items=[GetProjectResponse.from_domain_entity(project) for project in projects.items],
        page=projects.page,
        size=projects.size,
        total_items=projects.total_items,
        total_pages=projects.total_pages,
    )


@router.get("/{user_id}/partial", status_code=status.HTTP_200_OK, response_model=list[GetProjectResponse])
def get_partial_projects(
    user_id: ULID,
    size: int,
    usecase: Annotated[GetPartialProjectsUseCase, Depends(get_get_partial_projects_use_case)],
):
    projects: list[Project] = usecase(user_id=user_id, size=size)
    return [GetProjectResponse.from_domain_entity(project) for project in projects]


# Project Container
@router.get("/container/{project_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectContainerResponse])
def get_project_containers(
    project_id: ULID, usecase: Annotated[GetProjectContainersUseCase, Depends(get_get_project_containers_use_case)]
):
    project_containers: list[ProjectContainer] = usecase(project_id=project_id)
    return [
        GetProjectContainerResponse.from_domain_entity(project_container) for project_container in project_containers
    ]


@router.post("/container", status_code=status.HTTP_201_CREATED, response_model=CreateProjectContainerResponse)
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
    "/container/{project_container_id}", status_code=status.HTTP_200_OK, response_model=PatchProjectContainerResponse
)
def patch_project_container(
    project_container_id: ULID,
    request_model: PatchProjectContainerRequest,
    usecase: Annotated[PatchProjectContainerUseCase, Depends(get_patch_project_container_use_case)],
):
    try:
        command: PatchProjectContainerCommand = PatchProjectContainerCommand.model_validate(
            request_model.model_dump(mode="json")
        )
        project_container: ProjectContainer = usecase(project_container_id=project_container_id, command=command)
        return PatchProjectContainerResponse.from_domain_entity(project_container)
    except DuplicatedPartName as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/container/{project_container_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_container(
    project_container_id: ULID,
    usecase: Annotated[DeleteProjectContainerUseCase, Depends(get_delete_project_container_use_case)],
):
    try:
        usecase(project_container_id=project_container_id)
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/container/export/{project_container_id}", status_code=status.HTTP_200_OK, response_model=ExportPPTResponse
)
def export_ppt(
    project_container_id: ULID,
    request_model: ExportPPTRequest,
    usecase: Annotated[ExportPPTUseCase, Depends(get_export_ppt_use_case)],
):
    try:
        path: Path = usecase(project_container_id=project_container_id, save_path=request_model.save_path)
        return ExportPPTResponse(path=path)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProjectContainerNotCompleted as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
