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

  it("applies Tailwind utilities to the page layout, form, and primary button", () => {
    render(<App />);
    expect(screen.getByRole("main").classList.contains("min-h-screen")).toBe(true);
    expect(document.querySelector("form.auth-form").classList.contains("grid")).toBe(true);
    expect(screen.getByRole("button", { name: /sign in/i }).classList.contains("rounded-sm")).toBe(true);
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].headers.get("Authorization")).toBe("Bearer signed-token");
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
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "XC60" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "SUV" } });
    fireEvent.change(screen.getByLabelText("Minimum price"), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText("Maximum price"), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Search inventory" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain("make=Volvo");
    expect(fetchMock.mock.calls[1][0]).toContain("model=XC60");
    expect(fetchMock.mock.calls[1][0]).toContain("category=SUV");
    expect(fetchMock.mock.calls[1][0]).toContain("min_price=10000");
    expect(fetchMock.mock.calls[1][0]).toContain("max_price=50000");
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

  it("shows administrator inventory controls only to an administrator", async () => {
    localStorage.setItem("access_token", "admin-token");
    localStorage.setItem("is_admin", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<App />);
    expect(await screen.findByRole("button", { name: "Add vehicle" })).toBeTruthy();
    expect(screen.getByLabelText("Vehicle make")).toBeTruthy();
  });

  it("shows loading before an empty inventory result", async () => {
    localStorage.setItem("access_token", "customer-token");
    let finishRequest;
    const fetchMock = vi.fn(() => new Promise((resolve) => { finishRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    finishRequest({ ok: true, json: async () => [] });
    expect(await screen.findByRole("heading", { name: "No vehicles found" })).toBeTruthy();
  });

  it("recovers from an inventory error with an explicit retry", async () => {
    localStorage.setItem("access_token", "customer-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ detail: "Inventory is unavailable" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [vehicle] });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain("Inventory is unavailable");
    expect(screen.queryByRole("heading", { name: "No vehicles found" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry inventory load" }));
    expect(await screen.findByRole("heading", { name: "Volvo XC60" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("submits an add request and shows the new vehicle", async () => {
    const added = { ...vehicle, id: 2, make: "Honda", model: "Civic", price: "28000.00", quantity: 3 };
    const fetchMock = adminFetchMock([], added, [added]);
    renderAdmin(fetchMock);
    enterVehicle({ make: "Honda", model: "Civic", category: "Sedan", price: "28000", quantity: "3" });
    fireEvent.click(screen.getByRole("button", { name: "Add vehicle" }));

    expect(await screen.findByRole("heading", { name: "Honda Civic" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Vehicle added.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      make: "Honda", model: "Civic", category: "Sedan", price: 28000, quantity: 3,
    });
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer admin-token");
  });

  it("submits an edit request and renders the updated vehicle", async () => {
    const updated = { ...vehicle, model: "XC90", price: "65000.00" };
    const fetchMock = adminFetchMock([vehicle], updated, [updated]);
    renderAdmin(fetchMock);
    await screen.findByRole("heading", { name: "Volvo XC60" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Vehicle model"), { target: { value: "XC90" } });
    fireEvent.change(screen.getByLabelText("Vehicle price"), { target: { value: "65000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save vehicle" }));

    expect(await screen.findByRole("heading", { name: "Volvo XC90" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Vehicle updated.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ model: "XC90", price: 65000 });
  });

  it("submits a delete request and removes the vehicle from inventory", async () => {
    const fetchMock = adminFetchMock([vehicle], {}, []);
    renderAdmin(fetchMock);
    await screen.findByRole("heading", { name: "Volvo XC60" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("heading", { name: "No vehicles found" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Vehicle deleted.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer admin-token");
  });

  it("submits a restock request and renders the updated stock", async () => {
    const restocked = { ...vehicle, quantity: 6 };
    const fetchMock = adminFetchMock([vehicle], restocked, [restocked]);
    renderAdmin(fetchMock);
    await screen.findByRole("heading", { name: "Volvo XC60" });
    fireEvent.change(screen.getByLabelText("Restock quantity for Volvo XC60"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Restock" }));

    expect(await screen.findByText("6 in stock")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Vehicle restocked.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1/restock");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ quantity: 4 });
  });
});

describe("shareable vehicle details", () => {
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("loads a vehicle directly by its stable URL and links back to inventory", async () => {
    localStorage.setItem("access_token", "customer-token");
    window.history.replaceState({}, "", "/vehicles/1");
    const fetchMock = vi.fn().mockResolvedValue(response(vehicle));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Volvo XC60" })).toBeTruthy();
    expect(screen.getByText("SUV")).toBeTruthy();
    expect(screen.getByText("$48,900")).toBeTruthy();
    expect(screen.getByText("2 in stock")).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to inventory/i }).getAttribute("href")).toBe("/");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer customer-token");
  });

  it("shows a purchase button disabled when the detail has no stock", async () => {
    localStorage.setItem("access_token", "customer-token");
    window.history.replaceState({}, "", "/vehicles/1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...vehicle, quantity: 0 })));

    render(<App />);

    expect(await screen.findByText("Out of stock")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Out of stock" }).hasAttribute("disabled")).toBe(true);
  });

  it("does not show administrator actions to a customer", async () => {
    localStorage.setItem("access_token", "customer-token");
    window.history.replaceState({}, "", "/vehicles/1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(vehicle)));

    render(<App />);

    await screen.findByRole("heading", { name: "Volvo XC60" });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Restock" })).toBeNull();
  });
});

const vehicle = { id: 1, make: "Volvo", model: "XC60", category: "SUV", price: "48900.00", quantity: 2 };

function response(data, ok = true) {
  return { ok, json: async () => data };
}

function adminFetchMock(initialInventory, mutationResult, refreshedInventory) {
  return vi.fn()
    .mockResolvedValueOnce(response(initialInventory))
    .mockResolvedValueOnce(response(mutationResult))
    .mockResolvedValueOnce(response(refreshedInventory));
}

function renderAdmin(fetchMock) {
  localStorage.setItem("access_token", "admin-token");
  localStorage.setItem("is_admin", "true");
  vi.stubGlobal("fetch", fetchMock);
  return render(<App />);
}

function enterVehicle(values) {
  for (const [label, value] of Object.entries(values)) {
    const fieldName = {
      make: "Vehicle make",
      model: "Vehicle model",
      category: "Vehicle category",
      price: "Vehicle price",
      quantity: "Vehicle quantity",
    }[label];
    fireEvent.change(screen.getByLabelText(fieldName), { target: { value } });
  }
}
