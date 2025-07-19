import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ErrorBoundary, {
  RouteErrorBoundary,
  ComponentErrorBoundary,
  AsyncErrorBoundary,
} from "../index.jsx";

// Mock component that throws an error
const ThrowError = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

// Mock component for testing
const TestComponent = () => <div>Test Component</div>;

describe("ErrorBoundary Components", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("ErrorBoundary", () => {
    it("should render children when there is no error", () => {
      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Test Component")).toBeInTheDocument();
    });

    it("should render error UI when child component throws error", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText(/We apologize for the inconvenience/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
    });

    it("should show retry and go home buttons for global level errors", () => {
      render(
        <ErrorBoundary level="global">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /go home/i })
      ).toBeInTheDocument();
    });

    it("should call custom fallback when provided", () => {
      const customFallback = vi.fn((error, retry) => (
        <div>Custom error: {error?.message || "Unknown error"}</div>
      ));

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(customFallback).toHaveBeenCalled();
      expect(screen.getByText(/Custom error:/)).toBeInTheDocument();
    });

    it("should generate unique error ID", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorIdElement = screen.getByText(/Error ID:/);
      expect(errorIdElement).toBeInTheDocument();
      expect(errorIdElement.textContent).toMatch(/Error ID: [a-z0-9]+/);
    });
  });

  describe("RouteErrorBoundary", () => {
    it("should render route-specific error UI", () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText("Page Load Error")).toBeInTheDocument();
      expect(
        screen.getByText(/This page could not be loaded/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /go back/i })
      ).toBeInTheDocument();
    });
  });

  describe("ComponentErrorBoundary", () => {
    it("should render component-specific error UI", () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText("Component failed to load")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  describe("AsyncErrorBoundary", () => {
    it("should render async error UI", () => {
      render(
        <AsyncErrorBoundary>
          <ThrowError />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText("Loading Error")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load content/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reload page/i })
      ).toBeInTheDocument();
    });
  });
});
