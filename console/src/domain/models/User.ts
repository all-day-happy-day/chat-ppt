export interface User {
  id: string
  username: string
  email: string
  role: Role
  createdAt: Date
  lastSignIn: Date | null
}

export type Role = 'ADMIN' | 'USER'
