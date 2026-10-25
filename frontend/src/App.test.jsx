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

  it("provides a stable details link from each inventory card", async () => {
    localStorage.setItem("access_token", "customer-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([vehicle])));
    render(<App />);

    const detailsLink = await screen.findByRole("link", { name: "Volvo XC60" });
    expect(detailsLink.getAttribute("href")).toBe("/vehicles/1");
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

  it("cancels a purchase confirmation without calling the purchase API and restores focus", async () => {
    localStorage.setItem("access_token", "customer-token");
    const fetchMock = vi.fn().mockResolvedValue(response([vehicle]));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    const purchaseButton = await screen.findByRole("button", { name: "Purchase" });

    fireEvent.click(purchaseButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Volvo XC60");
    expect(dialog.textContent).toContain("$48,900");
    expect(dialog.textContent).toContain("does not process payment");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(purchaseButton);
  });

  it("traps focus in a purchase confirmation and closes it with Escape", async () => {
    localStorage.setItem("access_token", "customer-token");
    const fetchMock = vi.fn().mockResolvedValue(response([vehicle]));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    const purchaseButton = await screen.findByRole("button", { name: "Purchase" });
    fireEvent.click(purchaseButton);
    const cancel = await screen.findByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm purchase" });

    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(purchaseButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("confirms one purchase at a time and disables duplicate submission while pending", async () => {
    localStorage.setItem("access_token", "customer-token");
    let finishPurchase;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockImplementationOnce(() => new Promise((resolve) => { finishPurchase = resolve; }))
      .mockResolvedValueOnce(response([{ ...vehicle, quantity: 1 }]));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Purchase" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm purchase" }));

    const confirmButton = screen.getByRole("button", { name: "Processing purchase…" });
    expect(confirmButton.disabled).toBe(true);
    fireEvent.click(confirmButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1/purchase");
    finishPurchase(response({ ...vehicle, quantity: 1 }));

    expect(await screen.findByText("1 in stock")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shows purchase API errors inside the confirmation and permits a retry", async () => {
    localStorage.setItem("access_token", "customer-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response({ detail: "Vehicle is out of stock" }, false));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Purchase" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm purchase" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Vehicle is out of stock");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("opens the customer's own simulated purchase history", async () => {
    localStorage.setItem("access_token", "customer-token");
    const record = {
      id: 4, purchaser_id: 2, purchaser_email: "customer@example.com", vehicle_id: null,
      make: "Volvo", model: "XC60", unit_price: "48900.00", purchased_at: "2026-10-25T10:00:00Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response([record]));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "My Purchases" }));

    expect(await screen.findByRole("heading", { name: "My Purchases" })).toBeTruthy();
    expect(screen.getByText("Simulated inventory records only. No payment is processed.")).toBeTruthy();
    expect(screen.getByText("Volvo XC60")).toBeTruthy();
    expect(screen.getByText("$48,900.00")).toBeTruthy();
    expect(screen.getByText("Vehicle listing deleted; saved purchase details remain.")).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/purchases?limit=50&offset=0");
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer customer-token");
  });

  it("opens all simulated purchase history for an administrator only", async () => {
    localStorage.setItem("access_token", "admin-token");
    localStorage.setItem("is_admin", "true");
    const record = {
      id: 5, purchaser_id: 3, purchaser_email: "buyer@example.com", vehicle_id: 1,
      make: "Volvo", model: "XC60", unit_price: "48900.00", purchased_at: "2026-10-25T10:00:00Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response([record]));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Purchase History" }));

    expect(await screen.findByRole("heading", { name: "Purchase History" })).toBeTruthy();
    expect(screen.getByText("buyer@example.com")).toBeTruthy();
    expect(screen.getByText("Simulated inventory records only. No payment is processed.")).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/purchases?limit=50&offset=0");
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

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Volvo XC60");
    expect(dialog.textContent).toContain("cannot be undone from the UI");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete vehicle" }));

    expect(await screen.findByRole("heading", { name: "No vehicles found" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Vehicle deleted.");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[1][1].headers.get("Authorization")).toBe("Bearer admin-token");
  });

  it("cancels delete without an API request and returns focus to the opener", async () => {
    const fetchMock = adminFetchMock([vehicle], {}, []);
    renderAdmin(fetchMock);
    await screen.findByRole("heading", { name: "Volvo XC60" });
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(deleteButton);
  });

  it("prevents duplicate delete requests while confirmation is pending", async () => {
    let finishDelete;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockImplementationOnce(() => new Promise((resolve) => { finishDelete = resolve; }))
      .mockResolvedValueOnce(response([]));
    renderAdmin(fetchMock);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const confirm = await screen.findByRole("button", { name: "Delete vehicle" });
    fireEvent.click(confirm);
    expect(screen.getByRole("button", { name: "Deleting…" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Deleting…" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    finishDelete({ ok: true, json: async () => ({}) });

    expect(await screen.findByRole("heading", { name: "No vehicles found" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps a delete confirmation open with a useful error if deletion fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([vehicle]))
      .mockResolvedValueOnce(response({ detail: "Vehicle cannot be deleted" }, false));
    renderAdmin(fetchMock);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete vehicle" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Vehicle cannot be deleted");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(screen.getByText("Category").parentElement.querySelector("dd").textContent).toBe("SUV");
    expect(screen.getByText("Price").parentElement.querySelector("dd").textContent).toBe("$48,900");
    expect(screen.getByText("Stock").parentElement.querySelector("dd").textContent).toBe("2 in stock");
    expect(screen.getByRole("link", { name: /back to inventory/i }).getAttribute("href")).toBe("/");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer customer-token");
  });

  it("shows a purchase button disabled when the detail has no stock", async () => {
    localStorage.setItem("access_token", "customer-token");
    window.history.replaceState({}, "", "/vehicles/1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...vehicle, quantity: 0 })));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeTruthy();
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

  it("lets an administrator edit a vehicle from its details page", async () => {
    localStorage.setItem("access_token", "admin-token");
    localStorage.setItem("is_admin", "true");
    window.history.replaceState({}, "", "/vehicles/1");
    const updated = { ...vehicle, model: "XC90" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(vehicle))
      .mockResolvedValueOnce(response(updated))
      .mockResolvedValueOnce(response(updated));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await screen.findByRole("heading", { name: "Volvo XC60" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Vehicle model"), { target: { value: "XC90" } });
    fireEvent.click(screen.getByRole("button", { name: "Save vehicle" }));

    expect(await screen.findByRole("heading", { name: "Volvo XC90" })).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });

  it("lets an administrator restock a vehicle from its details page", async () => {
    localStorage.setItem("access_token", "admin-token");
    localStorage.setItem("is_admin", "true");
    window.history.replaceState({}, "", "/vehicles/1");
    const restocked = { ...vehicle, quantity: 6 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(vehicle))
      .mockResolvedValueOnce(response(restocked))
      .mockResolvedValueOnce(response(restocked));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await screen.findByRole("heading", { name: "Volvo XC60" });
    fireEvent.change(screen.getByLabelText("Restock quantity for Volvo XC60"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Restock" }));

    expect(await screen.findByText("6 in stock")).toBeTruthy();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/vehicles/1/restock");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ quantity: 4 });
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
