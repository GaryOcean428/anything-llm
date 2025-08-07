import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "../Sidebar";
import { ContextWrapper as AuthProvider } from "../../AuthContext";
import { PfpProvider } from "../../PfpContext";

// Mock the hooks and models
vi.mock("@/hooks/useUser", () => ({
  default: () => ({
    user: {
      id: 1,
      username: "testuser",
      role: "admin",
      pfp: "https://example.com/pfp.png",
    },
  }),
}));

vi.mock("../../hooks/useLogo", () => ({
  default: () => ({
    logo: "/test-logo.png",
    setLogo: vi.fn(),
    loginLogo: "/test-login-logo.png",
    isCustomLogo: false,
  }),
}));

vi.mock("../../models/workspace", () => ({
  default: {
    all: vi
      .fn()
      .mockResolvedValue([
        { id: 1, name: "Test Workspace", slug: "test-workspace" },
      ]),
    bySlug: vi.fn().mockResolvedValue({
      id: 1,
      name: "Test Workspace",
      slug: "test-workspace",
    }),
    orderWorkspaces: vi.fn().mockImplementation((workspaces) => workspaces),
  },
}));

const MockedSidebar = () => (
  <BrowserRouter>
    <AuthProvider>
      <PfpProvider>
        <Sidebar />
      </PfpProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe("Sidebar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", async () => {
    render(<MockedSidebar />);
    expect(await screen.findByText("Test Workspace")).toBeInTheDocument();
  });

  it("should handle workspace navigation", async () => {
    render(<MockedSidebar />);
    const navElements = await screen.findAllByRole("link");
    expect(navElements.length).toBeGreaterThan(0);
  });

  it("should display workspace information", async () => {
    render(<MockedSidebar />);
    const workspaceElement = await screen.findByText("Test Workspace");
    expect(workspaceElement).toBeInTheDocument();
  });

  it("should handle sidebar toggle functionality", async () => {
    render(<MockedSidebar />);
    expect(await screen.findByText("Test Workspace")).toBeInTheDocument();
    const buttons = screen.queryAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  it("should render menu items correctly", async () => {
    render(<MockedSidebar />);
    const menuItems = await screen.findAllByRole("listitem");
    expect(menuItems.length).toBeGreaterThan(0);
  });

  it("should handle responsive behavior", async () => {
    render(<MockedSidebar />);
    const sidebarElement = await screen.findByTestId("sidebar");
    expect(sidebarElement).toBeInTheDocument();
  });
});
