import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../App';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="browser-router">{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
    Route: ({ children }: { children: React.ReactNode }) => <div data-testid="route">{children}</div>,
  };
});

// Mock API services if they exist
vi.mock('../services/api', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    getDashboardData: vi.fn(),
    uploadDataset: vi.fn(),
    predictAttack: vi.fn(),
  }
}));

// Mock contexts
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
  }),
}));

describe('App Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render main app structure', () => {
    render(<App />);
    
    // Check if the main router structure is rendered
    expect(screen.getByTestId('browser-router')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});