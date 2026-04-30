export interface LyricsPart {
  part: string
  lyrics: string
}
export interface Lyrics {
  songId: string
  lyrics: LyricsPart[]
}
