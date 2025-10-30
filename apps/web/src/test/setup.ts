import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { setupServer } from "msw/node";
import React from "react";

vi.mock("server-only", () => ({}));

// Setup MSW server for API mocking (with bypass for unhandled requests)
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// Mock react-loader-spinner to avoid JSX rendering issues in happy-dom
vi.mock("react-loader-spinner", () => ({
  Circles: ({ visible, ...props }: any) => {
    if (!visible) return null;
    return React.createElement(
      "div",
      { "data-testid": "circles-loader", ...props },
      "Loading..."
    );
  },
  InfinitySpin: ({ color, width, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "infinity-spin", ...props },
      "Loading..."
    );
  },
}));
