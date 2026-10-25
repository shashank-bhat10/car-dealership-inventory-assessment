import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.jsx";

afterEach(cleanup);

describe("account access", () => {
  it("renders a labeled sign-in form", () => {
    render(<App />);
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("switches to registration with an accessible create-account form", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByRole("heading", { name: /join the road ahead/i })).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Password").getAttribute("minlength")).toBe("10");
    expect(screen.getByRole("button", { name: /create account/i })).toBeTruthy();
  });
});
