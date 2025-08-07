import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChatBubble from "../ChatBubble";
import React from "react";
import { PfpProvider } from "../../PfpContext";
import { ContextWrapper as AuthProvider } from "../../AuthContext";

// Create a simple mock for our purify utility.
const mockPurify = {
  sanitize: (html) => html, // It just returns the HTML as-is.
};

// Create a wrapper that includes all necessary providers.
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <PfpProvider>{children}</PfpProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe("ChatBubble Component", () => {
  it("should render a user message correctly", () => {
    const props = {
      fullText: "Hello, this is a user message.",
      type: "user",
      purify: mockPurify,
    };

    render(
      <TestWrapper>
        <ChatBubble {...props} />
      </TestWrapper>
    );

    expect(
      screen.getByText("Hello, this is a user message.")
    ).toBeInTheDocument();
  });

  it("should render an assistant message correctly", () => {
    const props = {
      fullText: "Hello, this is an assistant message.",
      type: "assistant",
      purify: mockPurify,
    };

    render(
      <TestWrapper>
        <ChatBubble {...props} />
      </TestWrapper>
    );

    expect(
      screen.getByText("Hello, this is an assistant message.")
    ).toBeInTheDocument();
  });

  it("should handle empty message content gracefully", () => {
    const props = {
      fullText: "",
      type: "user",
      purify: mockPurify,
    };

    render(
      <TestWrapper>
        <ChatBubble {...props} />
      </TestWrapper>
    );

    const content = screen.getByTestId("chat-bubble-content");
    expect(content.innerHTML).toBe("");
  });
});
