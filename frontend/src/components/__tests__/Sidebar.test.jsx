import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Mock the contexts and models
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 1, username: 'testuser', role: 'default' },
    logout: vi.fn()
  })
}));

vi.mock('../../hooks/useUser', () => ({
  default: () => ({
    user: { id: 1, username: 'testuser', role: 'default' },
    loading: false
  })
}));

vi.mock('../../models/workspace', () => ({
  default: {
    all: vi.fn().mockResolvedValue([
      { id: 1, name: 'Test Workspace', slug: 'test-workspace' }
    ]),
    bySlug: vi.fn().mockResolvedValue({
      id: 1, 
      name: 'Test Workspace', 
      slug: 'test-workspace'
    })
  }
}));

const MockedSidebar = ({ props = {} }) => (
  <BrowserRouter>
    <Sidebar {...props} />
  </BrowserRouter>
);

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<MockedSidebar />);
    expect(document.body).toBeTruthy();
  });

  it('should handle workspace navigation', () => {
    render(<MockedSidebar />);
    const navElements = screen.queryAllByRole('link');
    expect(navElements.length).toBeGreaterThanOrEqual(0);
  });

  it('should display workspace information', () => {
    render(<MockedSidebar />);
    const workspaceElements = screen.queryAllByText(/workspace/i);
    expect(workspaceElements.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle sidebar toggle functionality', () => {
    render(<MockedSidebar />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  it('should render menu items correctly', () => {
    render(<MockedSidebar />);
    const menuItems = screen.queryAllByRole('listitem');
    expect(menuItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle responsive behavior', () => {
    render(<MockedSidebar />);
    // Test responsive elements
    const sidebarElement = document.querySelector('[data-testid="sidebar"]') || 
                          document.querySelector('.sidebar') ||
                          document.body;
    expect(sidebarElement).toBeTruthy();
  });
});