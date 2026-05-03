export interface Song {
  id: string
  title: string
  artist: string | null
  /** Present when API returns timestamps (e.g. paged list). */
  createdAt?: Date
  updatedAt?: Date
}
