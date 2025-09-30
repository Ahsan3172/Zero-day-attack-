import { ReactNode } from 'react'

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface AuthContextType {
  user: any | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<any>) => Promise<boolean>
}

export type AuthProviderProps = { children?: ReactNode }
