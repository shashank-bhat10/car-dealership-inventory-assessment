import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("account access", () => {
  it("renders a labeled sign-in form", () => {
    render(<App />);
    expect(screen.getByLabelText("Email address").getAttribute("type")).toBe("email");
    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("password");
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

  it("registers, logs in, and stores the returned bearer token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, email: "new@example.com" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "signed-token", token_type: "bearer" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Safe-Drive-2046" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(localStorage.getItem("access_token")).toBe("signed-token"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a useful error when login is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Incorrect email or password" }),
      }),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "incorrect" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("Incorrect email or password");
  });
});

describe("inventory dashboard", () => {
  it("loads protected inventory and renders vehicle details", async () => {
    localStorage.setItem("access_token", "customer-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 1, make: "Volvo", model: "XC60", category: "SUV", price: "48900.00", quantity: 4 },
        ],
      }),
    );
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Volvo XC60" })).toBeTruthy();
    expect(screen.getByText("$48,900")).toBeTruthy();
    expect(screen.getByText("4 in stock")).toBeTruthy();
  });

  it("searches vehicles by make, category, and price range", async () => {
    localStorage.setItem("access_token", "customer-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.change(screen.getByLabelText("Make"), { target: { value: "Volvo" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "SUV" } });
    fireEvent.change(screen.getByLabelText("Minimum price"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: "Search inventory" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain("make=Volvo");
    expect(fetchMock.mock.calls[1][0]).toContain("category=SUV");
    expect(fetchMock.mock.calls[1][0]).toContain("min_price=10000");
  });

  it("prevents a customer purchase when the only vehicle is out of stock", async () => {
    localStorage.setItem("access_token", "customer-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 3, make: "Volvo", model: "XC60", category: "SUV", price: 48900, quantity: 0 }],
    }));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Volvo XC60" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Out of stock" }).hasAttribute("disabled")).toBe(true);
  });
});
