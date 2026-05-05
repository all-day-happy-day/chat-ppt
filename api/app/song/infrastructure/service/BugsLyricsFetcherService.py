import requests
from bs4 import BeautifulSoup, Tag

from app.song.domain.exception import FailedToFetch, NoLyrics
from app.song.domain.service import LyricsFetcherService


class BugsLyricsFetcherService(LyricsFetcherService):
    page_threshold: int = 10

    def _get_title_and_artist(self, song: Tag) -> tuple[str, str]:
        # title
        title_outer: Tag | None = song.find(name="p", class_="title")
        assert title_outer is not None
        title_found: str = str(title_outer.text).strip()

        # artist
        artist_outer: Tag | None = song.find(name="p", class_="artist")
        assert artist_outer is not None
        artist_found: str
        if artist_outer.find(name="a") is not None:
            artist_inner: Tag | None = artist_outer.find(name="a")
            assert artist_inner is not None
            artist_found = str(artist_inner.text).strip()
        else:
            artist_found = str(artist_outer.text).strip()

        return title_found, artist_found

    def _fetch_lyrics(self, song: Tag, title: str, artist: str | None) -> str | None:
        try:
            lyrics_outer: Tag | None = song.find(name="a", class_="trackInfo")
            if lyrics_outer is None:
                raise NoLyrics(f"No lyrics found for {title} by {artist}")

            lyrics_url: str = str(lyrics_outer["href"])
            lyrics_response: requests.Response = requests.get(url=lyrics_url)

            if lyrics_response.status_code != 200:
                raise NoLyrics(f"No lyrics found for {title} by {artist}")

            lyrics_soup: BeautifulSoup = BeautifulSoup(markup=lyrics_response.text, features="html.parser")
            lyrics_container: Tag | None = lyrics_soup.find(name="div", class_="lyricsContainer")

            if lyrics_container is None:
                raise NoLyrics(f"No lyrics found for {title} by {artist}")

            lyrics_only: Tag | None = lyrics_container.find(name="xmp")
            if lyrics_only is None:
                raise NoLyrics(f"No lyrics found for {title} by {artist}")

            lyrics: str = str(lyrics_only.text)
            lyrics_parsed: list[str] = BugsLyricsFetcherService.process_lyrics(lyrics_parsed=lyrics.split("\n"))
            lyrics = "\n".join(lyrics_parsed)

            return lyrics

        except NoLyrics:
            return None

    def search(self, title: str, artist: str | None, page: int = 1) -> list[tuple[str, str, str | None]]:
        search_keyword: str = title

        url: str = (
            f"https://music.bugs.co.kr/search/track?q={search_keyword}"
            f"&target=TRACK_ONLY&flac_only=false&sort=A&page={page}"
        )

        response: requests.Response = requests.get(url=url)
        if response.status_code != 200:
            raise requests.HTTPError(f"Failed to fetch the page: {url}")
        soup: BeautifulSoup = BeautifulSoup(markup=response.text, features="html.parser")

        track_list: Tag | None = soup.find(name="table", class_="list trackList")
        assert track_list is not None
        songs: list[Tag] = track_list.find_all(name="tr", trackid=True)

        title_found: str | None = None
        artist_found: str | None = None
        lyrics: str | None = None
        results: list[tuple[str, str, str | None]] = []
        for song in songs:
            title_found, artist_found = self._get_title_and_artist(song=song)
            lyrics = self._fetch_lyrics(song=song, title=title, artist=artist)

            results.append((title_found, artist_found, lyrics))

        return results

    def fetch(self, title: str, artist: str | None) -> tuple[str, str, str]:
        found: bool = False
        failed_to_find_flag: bool = False
        page_num: int = 1
        page_thresholded: bool = False

        search_keyword: str = title
        search_keyword = search_keyword.replace(" ", "%20")

        while True:
            url: str = (
                f"https://music.bugs.co.kr/search/track?q={search_keyword}"
                f"&target=TRACK_ONLY&flac_only=false&sort=A&page={page_num}"
            )
            print(url)

            response: requests.Response = requests.get(url=url)
            if response.status_code != 200:
                raise requests.HTTPError(f"Failed to fetch the page: {url}")
            soup: BeautifulSoup = BeautifulSoup(markup=response.text, features="html.parser")

            track_list: Tag | None = soup.find(name="table", class_="list trackList")

            if track_list is None:
                raise FailedToFetch(f"Failed to fetch the track list from {url}")

            songs: list[Tag] = track_list.find_all(name="tr", trackid=True)

            title_found: str | None = None
            artist_found: str | None = None
            lyrics: str | None = None
            for song in songs:
                title_found, artist_found = self._get_title_and_artist(song=song)

                # Compare
                if artist is not None:
                    if page_num == self.page_threshold:
                        if not page_thresholded:
                            page_thresholded = True
                            page_num = 1
                            continue
                        else:
                            failed_to_find_flag = True
                            break

                    processed_artist: str
                    processed_artist_found: str
                    if not page_thresholded:
                        processed_artist = BugsLyricsFetcherService.process_string_for_comparison(s=artist)
                        processed_artist_found = BugsLyricsFetcherService.process_string_for_comparison(s=artist_found)
                    else:
                        processed_artist = BugsLyricsFetcherService.process_string_for_comparison_only_letters(s=artist)
                        processed_artist_found = BugsLyricsFetcherService.process_string_for_comparison_only_letters(
                            s=artist_found
                        )
                    if BugsLyricsFetcherService.strings_match(s1=processed_artist, s2=processed_artist_found):
                        pass
                    else:
                        continue

                found = True

                # Lyrics
                lyrics = self._fetch_lyrics(song=song, title=title, artist=artist)
                if lyrics is None:
                    continue
                else:
                    break

            if found:
                break
            else:
                if failed_to_find_flag:
                    break
                page_num += 1

        if not found or lyrics is None or title_found is None or artist_found is None:
            raise FailedToFetch(f"Failed to fetch the lyrics: {title}")

        return title_found, artist_found, lyrics
