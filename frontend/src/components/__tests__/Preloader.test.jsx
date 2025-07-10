import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PreLoader, { FullScreenLoader } from "../Preloader.jsx";

describe("PreLoader Component", () => {
  it("renders with default size", () => {
    render(<PreLoader />);
    const preloader = document.querySelector(".animate-spin");
    expect(preloader).toBeInTheDocument();
    expect(preloader).toHaveClass("h-16", "w-16");
  });

  it("renders with custom size", () => {
    render(<PreLoader size="24" />);
    const preloader = document.querySelector(".animate-spin");
    expect(preloader).toBeInTheDocument();
    expect(preloader).toHaveClass("h-24", "w-24");
  });

  it("has correct animation and styling classes", () => {
    render(<PreLoader />);
    const preloader = document.querySelector(".animate-spin");
    expect(preloader).toHaveClass("animate-spin", "rounded-full", "border-4");
  });
});

describe("FullScreenLoader Component", () => {
  it("renders full screen loader", () => {
    render(<FullScreenLoader />);
    const loader = document.getElementById("preloader");
    expect(loader).toBeInTheDocument();
  });

  it("has correct full screen styling", () => {
    render(<FullScreenLoader />);
    const container = document.getElementById("preloader");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass(
      "fixed",
      "left-0",
      "top-0",
      "h-screen",
      "w-screen"
    );
  });

  it("contains animated spinner", () => {
    render(<FullScreenLoader />);
    const container = document.getElementById("preloader");
    const spinner = container?.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("h-16", "w-16", "animate-spin", "rounded-full");
  });
});
