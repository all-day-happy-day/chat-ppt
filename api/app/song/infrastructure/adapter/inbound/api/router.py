from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from ulid import ULID

from app.di.application.usecase import (
    get_delete_song_use_case,
    get_get_lyrics_use_case,
    get_get_songs_use_case,
    get_patch_lyrics_use_case,
    get_patch_song_use_case,
    get_scrap_lyrics_use_case,
)
from app.shared.song.domain.valueobject import Lyrics
from app.song.application.usecase import (
    DeleteSongUseCase,
    GetLyricsUseCase,
    GetSongsUseCase,
    PatchLyricsUseCase,
    PatchSongUseCase,
    ScrapLyricsUseCase,
)
from app.song.domain.entity import Song
from app.song.domain.exception import DuplicatedSong, FailedToFetch, LyricsNotFound, SongNotFound
from app.song.infrastructure.adapter.inbound.api.message import (
    GetLyricsResponse,
    GetSongsRequest,
    GetSongsResponse,
    PatchLyricsRequest,
    PatchLyricsResponse,
    PatchSongRequest,
    PatchSongResponse,
    ScrapLyricsRequest,
    ScrapLyricsResponse,
)

router: APIRouter = APIRouter(tags=["Lyrics"])


@router.get("/list-songs", status_code=status.HTTP_200_OK, response_model=GetSongsResponse)
def list_songs(request_model: GetSongsRequest, usecase: Annotated[GetSongsUseCase, Depends(get_get_songs_use_case)]):
    songs: list[Song] = usecase(title=request_model.title) or []
    return GetSongsResponse(songs=songs)


@router.get("/lyrics/scrap", status_code=status.HTTP_200_OK, response_model=ScrapLyricsResponse)
def scrap_lyrics(
    request_model: ScrapLyricsRequest,
    usecase: Annotated[ScrapLyricsUseCase, Depends(get_scrap_lyrics_use_case)],
):
    try:
        song, lyrics = usecase(
            title=request_model.title, artist=request_model.artist, overwrite=request_model.overwrite
        )
        return ScrapLyricsResponse(song=song, lyrics=lyrics)
    except FailedToFetch as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DuplicatedSong as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/lyrics/get/{song_id}", status_code=status.HTTP_200_OK, response_model=GetLyricsResponse)
def get_lyrics(song_id: ULID, usecase: Annotated[GetLyricsUseCase, Depends(get_get_lyrics_use_case)]):
    try:
        song, lyrics = usecase(song_id=song_id)
        return GetLyricsResponse(song=song, lyrics=lyrics)
    except LyricsNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/song/{song_id}", status_code=status.HTTP_200_OK, response_model=PatchSongResponse)
def patch_song(
    song_id: ULID,
    request_model: PatchSongRequest,
    usecase: Annotated[PatchSongUseCase, Depends(get_patch_song_use_case)],
):
    try:
        song: Song = usecase(song_id=song_id, title=request_model.title, artist=request_model.artist)
        return PatchSongResponse(song=song)
    except SongNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/lyrics/{song_id}", status_code=status.HTTP_200_OK, response_model=PatchLyricsResponse)
def patch_lyrics(
    song_id: ULID,
    request_model: PatchLyricsRequest,
    usecase: Annotated[PatchLyricsUseCase, Depends(get_patch_lyrics_use_case)],
):
    try:
        lyrics: Lyrics = usecase(song_id=song_id, lyrics=request_model.lyrics)
        return PatchLyricsResponse(lyrics=lyrics)
    except LyricsNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song(song_id: ULID, usecase: Annotated[DeleteSongUseCase, Depends(get_delete_song_use_case)]):
    try:
        usecase(song_id=song_id)
        return
    except SongNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except LyricsNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
