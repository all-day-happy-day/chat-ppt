import requests
from bs4 import BeautifulSoup, Tag

from app.song.domain.exception import FailedToFetch
from app.song.domain.service import LyricsFetcherService


class BugsLyricsFetcherService(LyricsFetcherService):
    page_threshold: int = 10

    def fetch(self, title: str, artist: str | None) -> tuple[str, str, str]:
        found: bool = False
        failed_to_find_flag: bool = False
        page_num: int = 1
        page_thresholded: bool = False

        while True:
            url: str = (
                f"https://music.bugs.co.kr/search/track?q={title}"
                f"&target=TRACK_ONLY&flac_only=false&sort=A&page={page_num}"
            )

            response: requests.Response = requests.get(url=url)
            if response.status_code != 200:
                raise requests.HTTPError(f"Failed to fetch the page: {url}")
            soup: BeautifulSoup = BeautifulSoup(markup=response.text, features="html.parser")

            track_list: Tag | None = soup.find(name="table", class_="list trackList")
            assert track_list is not None
            songs: list[Tag] = track_list.find_all(name="tr", trackid=True)

            for song in songs:
                # Title
                title_outer: Tag | None = song.find(name="p", class_="title")
                assert title_outer is not None
                title_found: str = str(title_outer.text).strip()

                # Artist
                artist_outer: Tag | None = song.find(name="p", class_="artist")
                assert artist_outer is not None
                artist_found: str
                if artist_outer.find(name="a") is not None:
                    artist_inner: Tag | None = artist_outer.find(name="a")
                    assert artist_inner is not None
                    artist_found = str(artist_inner.text).strip()
                else:
                    artist_found = str(artist_outer.text).strip()

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
                lyrics_outer: Tag | None = song.find(name="a", class_="trackInfo")
                assert lyrics_outer is not None
                lyrics_url: str = str(lyrics_outer["href"])
                lyrics_response: requests.Response = requests.get(url=lyrics_url)
                if lyrics_response.status_code != 200:
                    raise requests.HTTPError(f"Failed to fetch the lyrics: {lyrics_url}")
                lyrics_soup: BeautifulSoup = BeautifulSoup(markup=lyrics_response.text, features="html.parser")
                lyrics_container: Tag | None = lyrics_soup.find(name="div", class_="lyricsContainer")
                assert lyrics_container is not None
                lyrics_only: Tag | None = lyrics_container.find(name="xmp")
                assert lyrics_only is not None
                lyrics: str = str(lyrics_only.text)
                lyrics_parsed: list[str] = BugsLyricsFetcherService.process_lyrics(lyrics_parsed=lyrics.split("\n"))
                lyrics = "\n".join(lyrics_parsed)
                break

            if found:
                break
            else:
                if failed_to_find_flag:
                    break
                page_num += 1

        if not found:
            raise FailedToFetch(f"Failed to fetch the lyrics: {title}")

        return title_found, artist_found, lyrics
