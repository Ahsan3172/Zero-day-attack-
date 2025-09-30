import { ReactNode } from 'react'

/** Cleaned auth types used by AuthContext and consumers */
export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface AuthContextType {
  user: unknown | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<unknown>) => Promise<boolean>
}

export type AuthProviderProps = { children?: ReactNode }
