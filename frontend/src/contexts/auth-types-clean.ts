import { ReactNode } from 'react'
import { User } from '../services/api'

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<boolean>
}

export type AuthProviderProps = { children?: ReactNode }
