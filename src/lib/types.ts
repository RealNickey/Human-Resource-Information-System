export type UserRole = 'admin' | 'manager' | 'employee'

export interface UserMetadata {
  role?: UserRole
  full_name?: string
}

export interface UserWithRole {
  email: string
  role: UserRole
}
