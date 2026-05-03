export interface Song {
  id: string
  title: string
  artist: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
}
