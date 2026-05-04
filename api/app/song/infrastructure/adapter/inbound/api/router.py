from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from ulid import ULID

from app.di.application.usecase import (
    get_delete_song_use_case,
    get_get_lyrics_use_case,
    get_get_paged_songs_use_case,
    get_get_partial_songs_use_case,
    get_get_songs_use_case,
    get_list_all_songs_use_case,
    get_patch_lyrics_use_case,
    get_patch_song_use_case,
    get_save_song_use_case,
    get_scrape_lyrics_use_case,
    get_scrape_search_songs_use_case,
)
from app.shared.page import Page, PagingOptions
from app.shared.song.domain.exception import DuplicatedPartName
from app.shared.song.domain.valueobject import Lyrics
from app.song.application.usecase import (
    DeleteSongUseCase,
    GetLyricsUseCase,
    GetPagedSongsUseCase,
    GetPartialSongsUseCase,
    GetSongsUseCase,
    ListAllSongsUseCase,
    PatchLyricsUseCase,
    PatchSongUseCase,
    SaveSongUseCase,
    ScrapeLyricsUseCase,
    ScrapeSearchSongsUseCase,
)
from app.song.domain.entity import Song
from app.song.domain.exception import DuplicatedSong, FailedToFetch, LyricsNotFound, SongNotFound
from app.song.infrastructure.adapter.inbound.api.message import (
    GetLyricsResponse,
    GetSongsResponse,
    PatchLyricsRequest,
    PatchLyricsResponse,
    PatchSongRequest,
    PatchSongResponse,
    SaveSongRequest,
    SaveSongResponse,
    ScrapeLyricsResponse,
    ScrapeSearchSongsResponse,
)

router: APIRouter = APIRouter(tags=["Lyrics"])


@router.get("/list-songs", status_code=status.HTTP_200_OK, response_model=GetSongsResponse)
def list_songs(
    title: Annotated[str, Query(...)],
    usecase: Annotated[GetSongsUseCase, Depends(get_get_songs_use_case)],
):
    songs: list[Song] = usecase(title=title) or []
    return GetSongsResponse(songs=songs)


@router.get("/list-all-songs", status_code=status.HTTP_200_OK, response_model=GetSongsResponse)
def list_all_songs(usecase: Annotated[ListAllSongsUseCase, Depends(get_list_all_songs_use_case)]):
    songs: list[Song] = usecase()
    return GetSongsResponse(songs=songs)


@router.get("/lyrics/scrape", status_code=status.HTTP_200_OK, response_model=ScrapeLyricsResponse)
def scrape_lyrics(
    title: Annotated[str, Query(...)],
    artist: Annotated[str | None, Query(...)],
    usecase: Annotated[ScrapeLyricsUseCase, Depends(get_scrape_lyrics_use_case)],
):
    try:
        if artist == "":
            artist = None
        title, artist, lyrics = usecase(
            title=title,
            artist=artist,
        )
        return ScrapeLyricsResponse(title=title, artist=artist, lyrics=lyrics)
    except FailedToFetch as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DuplicatedSong as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/scrape-search-songs", status_code=status.HTTP_200_OK, response_model=ScrapeSearchSongsResponse)
def scrape_search_songs(
    title: Annotated[str, Query(...)],
    artist: Annotated[str | None, Query(...)],
    page: Annotated[int, Query(...)],
    usecase: Annotated[ScrapeSearchSongsUseCase, Depends(get_scrape_search_songs_use_case)],
):
    if artist == "":
        artist = None
    songs: list[tuple[str, str, str | None]] = usecase(title=title, artist=artist, page=page)
    return ScrapeSearchSongsResponse(songs=songs, page=page, size=len(songs))


@router.post("/save", status_code=status.HTTP_200_OK, response_model=SaveSongResponse)
def save_song(
    request_model: SaveSongRequest,
    usecase: Annotated[SaveSongUseCase, Depends(get_save_song_use_case)],
):
    try:
        song, lyrics = usecase(
            user_id=request_model.user_id,
            title=request_model.title,
            artist=request_model.artist,
            lyrics=request_model.lyrics,
        )
        return SaveSongResponse(song=song, lyrics=lyrics)
    except DuplicatedSong as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/lyrics/get/{song_id}", status_code=status.HTTP_200_OK, response_model=GetLyricsResponse)
def get_lyrics(song_id: ULID, usecase: Annotated[GetLyricsUseCase, Depends(get_get_lyrics_use_case)]):
    try:
        song, lyrics = usecase(song_id=song_id)
        return GetLyricsResponse(song=song, lyrics=lyrics)
    except LyricsNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DuplicatedPartName as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{song_id}", status_code=status.HTTP_200_OK, response_model=PatchSongResponse)
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
    except DuplicatedPartName as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song(song_id: ULID, usecase: Annotated[DeleteSongUseCase, Depends(get_delete_song_use_case)]):
    try:
        usecase(song_id=song_id)
    except SongNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except LyricsNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/list-songs/page", status_code=status.HTTP_200_OK, response_model=Page[GetSongsResponse])
def get_paged_songs(
    paging_options: Annotated[PagingOptions, Depends()],
    usecase: Annotated[GetPagedSongsUseCase, Depends(get_get_paged_songs_use_case)],
):
    songs: Page[Song] = usecase(paging_options=paging_options)
    return Page(
        items=[GetSongsResponse(songs=[song]) for song in songs.items],
        page=songs.page,
        size=songs.size,
        total_items=songs.total_items,
        total_pages=songs.total_pages,
    )


@router.get("/list-songs/partial", status_code=status.HTTP_200_OK, response_model=GetSongsResponse)
def get_partial_songs(
    size: int,
    usecase: Annotated[GetPartialSongsUseCase, Depends(get_get_partial_songs_use_case)],
):
    songs: list[Song] = usecase(size=size)
    return GetSongsResponse(songs=songs)
