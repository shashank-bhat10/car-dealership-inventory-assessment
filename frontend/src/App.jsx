import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, CarFront } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") ?? "");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("is_admin") === "true");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [filters, setFilters] = useState({ make: "", model: "", category: "", min_price: "", max_price: "" });
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ make: "", model: "", category: "", price: "", quantity: "" });
  const [restockAmounts, setRestockAmounts] = useState({});
  const [pathname, setPathname] = useState(window.location.pathname);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    setNotice("");
    setDetailError("");
  };

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function request(path, options = {}) {
    const headers = new Headers(options.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail ?? "The request could not be completed.");
    return data;
  }

  const loadVehicles = useCallback(async (selected = {}) => {
    setLoading(true);
    setInventoryError("");
    try {
      const query = new URLSearchParams(Object.entries(selected).filter(([, value]) => value !== ""));
      setVehicles(await request(`/api/vehicles${query.size ? `?${query}` : ""}`));
    } catch (requestError) {
      setInventoryError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadVehicle = useCallback(async (vehicleId) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetailVehicle(await request(`/api/vehicles/${vehicleId}`));
    } catch (requestError) {
      setDetailVehicle(null);
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  async function purchase(vehicleId) {
    setNotice("");
    try {
      await request(`/api/vehicles/${vehicleId}/purchase`, { method: "POST" });
      setNotice("Purchase completed.");
      if (pathname.startsWith("/vehicles/")) await loadVehicle(vehicleId);
      else await loadVehicles(filters);
    } catch (requestError) { setInventoryError(requestError.message); }
  }

  async function saveVehicle(event) {
    event.preventDefault();
    try {
      await request(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vehicleForm, price: Number(vehicleForm.price), quantity: Number(vehicleForm.quantity) }),
      });
      setNotice(editingId ? "Vehicle updated." : "Vehicle added.");
      setEditingId(null);
      setVehicleForm({ make: "", model: "", category: "", price: "", quantity: "" });
      if (pathname.startsWith("/vehicles/")) await loadVehicle(editingId);
      else await loadVehicles(filters);
    } catch (requestError) { setInventoryError(requestError.message); }
  }

  async function adminAction(vehicleId, action, body) {
    try {
      await request(`/api/vehicles/${vehicleId}${action}`, {
        method: action === "/restock" ? "POST" : "DELETE",
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      if (action === "") {
        navigate("/");
        setNotice("Vehicle deleted.");
        await loadVehicles(filters);
      } else {
        setNotice("Vehicle restocked.");
        if (pathname.startsWith("/vehicles/")) await loadVehicle(vehicleId);
        else await loadVehicles(filters);
      }
    } catch (requestError) { setInventoryError(requestError.message); }
  }

  useEffect(() => {
    if (!token) return;
    const vehicleRoute = pathname.match(/^\/vehicles\/(\d+)\/?$/);
    if (vehicleRoute) loadVehicle(Number(vehicleRoute[1]));
    else loadVehicles();
  }, [token, pathname, loadVehicles, loadVehicle]);

  async function submitAccount(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await request("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }
      const result = await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("is_admin", String(Boolean(result.is_admin)));
      localStorage.setItem("account_email", email);
      setToken(result.access_token);
      setIsAdmin(Boolean(result.is_admin));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    const vehicleRoute = pathname.match(/^\/vehicles\/(\d+)\/?$/);
    const viewingVehicle = Boolean(vehicleRoute);
    return (
          <main className="app-shell mx-auto w-full">
        <header className="topbar">
          <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>
            <span className="brand-icon"><CarFront size={21} /></span>
            <span>MOTORHAUS<small>DRIVE YOUR WAY</small></span>
          </a>
          <div className="account-summary">
            {isAdmin && <span className="role-pill">Administrator</span>}
            <span>{localStorage.getItem("account_email")}</span>
            <button className="text-button" onClick={() => {
              localStorage.clear();
              setToken("");
              setIsAdmin(false);
            }}>Sign out</button>
          </div>
        </header>
        {viewingVehicle ? <section className="page-content vehicle-page">
          <a className="text-button back-link" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}>← Back to inventory</a>
          {detailLoading && <p role="status" className="state-message">Loading vehicle details…</p>}
          {detailError && <div className="inventory-error"><p role="alert" className="error-message">{detailError}</p><button type="button" onClick={() => loadVehicle(Number(vehicleRoute[1]))}>Retry vehicle details</button></div>}
          {detailVehicle && <>
            <span className="eyebrow">VEHICLE DETAILS</span>
            <article className="vehicle-detail-card">
              <div className="vehicle-art vehicle-art-0" aria-hidden="true"><CarFront size={140} strokeWidth={0.8} /></div>
              <div className="vehicle-details">
                <span className="vehicle-category">{detailVehicle.category}</span>
                <h1>{detailVehicle.make} {detailVehicle.model}</h1>
                <strong>${Number(detailVehicle.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
                <dl className="vehicle-specs">
                  <div><dt>Make</dt><dd>{detailVehicle.make}</dd></div>
                  <div><dt>Model</dt><dd>{detailVehicle.model}</dd></div>
                  <div><dt>Category</dt><dd>{detailVehicle.category}</dd></div>
                  <div><dt>Price</dt><dd>${Number(detailVehicle.price).toLocaleString("en-US", { maximumFractionDigits: 2 })}</dd></div>
                  <div><dt>Vehicle ID</dt><dd>{detailVehicle.id}</dd></div>
                  <div><dt>Stock</dt><dd>{detailVehicle.quantity > 0 ? `${detailVehicle.quantity} in stock` : "Out of stock"}</dd></div>
                </dl>
                <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" disabled={detailVehicle.quantity === 0} onClick={() => purchase(detailVehicle.id)}>{detailVehicle.quantity > 0 ? "Purchase" : "Out of stock"}</button>
                {isAdmin && <section className="admin-actions" aria-label="Administrator vehicle actions">
                  {editingId === detailVehicle.id ? <form className="admin-form" onSubmit={saveVehicle}>
                    <h2>Edit vehicle</h2>
                    {["make", "model", "category", "price", "quantity"].map((key) => <label key={key}>Vehicle {key}<input aria-label={`Vehicle ${key}`} required type={key === "price" || key === "quantity" ? "number" : "text"} min={key === "price" ? "0.01" : key === "quantity" ? "0" : undefined} step={key === "price" ? "0.01" : key === "quantity" ? "1" : undefined} value={vehicleForm[key]} onChange={(event) => setVehicleForm({ ...vehicleForm, [key]: event.target.value })} /></label>)}
                    <button className="primary-button" type="submit">Save vehicle</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel edit</button>
                  </form> : <button type="button" onClick={() => { setEditingId(detailVehicle.id); setVehicleForm({ make: detailVehicle.make, model: detailVehicle.model, category: detailVehicle.category, price: String(detailVehicle.price), quantity: String(detailVehicle.quantity) }); }}>Edit</button>}
                  <button type="button" onClick={() => adminAction(detailVehicle.id, "")}>Delete</button>
                  <label>Restock quantity<input aria-label={`Restock quantity for ${detailVehicle.make} ${detailVehicle.model}`} type="number" min="1" value={restockAmounts[detailVehicle.id] ?? "1"} onChange={(event) => setRestockAmounts({ ...restockAmounts, [detailVehicle.id]: event.target.value })} /></label>
                  <button type="button" onClick={() => adminAction(detailVehicle.id, "/restock", { quantity: Number(restockAmounts[detailVehicle.id] ?? 1) })}>Restock</button>
                </section>}
              </div>
            </article>
          </>}
        </section> : <section id="inventory" className="page-content">
          <span className="eyebrow">THE MOTORHAUS COLLECTION</span>
          <div className="inventory-heading">
            <div><h1>Available vehicles</h1><p>Your next drive starts here.</p></div>
            <span className="inventory-count">{String(vehicles.length).padStart(2, "0")}</span>
          </div>
          <form className="filters" onSubmit={(event) => { event.preventDefault(); loadVehicles(filters); }}>
            {[["Make", "make"], ["Model", "model"], ["Category", "category"], ["Minimum price", "min_price"], ["Maximum price", "max_price"]].map(([label, key]) => (
              <label key={key}>{label}<input aria-label={label} type={key.includes("price") ? "number" : "search"} min={key.includes("price") ? "0" : undefined} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} /></label>
            ))}
              <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit">Search inventory</button>
          </form>
          {isAdmin && <form className="admin-form" onSubmit={saveVehicle}>
            <h2>{editingId ? "Update vehicle" : "Add a vehicle"}</h2>
            {[["Vehicle make", "make"], ["Vehicle model", "model"], ["Vehicle category", "category"], ["Vehicle price", "price"], ["Vehicle quantity", "quantity"]].map(([label, key]) => (
              <label key={key}>{label}<input aria-label={label} required min={key === "price" ? "0.01" : key === "quantity" ? "0" : undefined} type={key === "price" || key === "quantity" ? "number" : "text"} step={key === "price" ? "0.01" : key === "quantity" ? "1" : undefined} value={vehicleForm[key]} onChange={(event) => setVehicleForm({ ...vehicleForm, [key]: event.target.value })} /></label>
            ))}
            <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit">{editingId ? "Save vehicle" : "Add vehicle"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setVehicleForm({ make: "", model: "", category: "", price: "", quantity: "" }); }}>Cancel edit</button>}
          </form>}
          {inventoryError && <div className="inventory-error">
            <p className="error-message" role="alert">{inventoryError}</p>
            <button type="button" onClick={() => loadVehicles(filters)}>Retry inventory load</button>
          </div>}
          {notice && <p role="status">{notice}</p>}
          {loading ? (
            <p role="status" className="state-message">Loading the collection…</p>
          ) : vehicles.length > 0 ? (
            <div className="vehicle-grid">
              {vehicles.map((vehicle, index) => (
                <article className="vehicle-card" key={vehicle.id}>
                  <div className={`vehicle-art vehicle-art-${index % 3}`} aria-hidden="true">
                    <CarFront size={110} strokeWidth={0.8} />
                  </div>
                  <div className="vehicle-details">
                    <span className="vehicle-category">{vehicle.category}</span>
                    <h2><a href={`/vehicles/${vehicle.id}`} onClick={(event) => { event.preventDefault(); navigate(`/vehicles/${vehicle.id}`); }}>{vehicle.make} {vehicle.model}</a></h2>
                    <strong>${Number(vehicle.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
                    <span className={vehicle.quantity > 0 ? "stock-label" : "stock-label sold-out"}>
                      {vehicle.quantity > 0 ? `${vehicle.quantity} in stock` : "Out of stock"}
                    </span>
                    <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" disabled={vehicle.quantity === 0} onClick={() => purchase(vehicle.id)}>{vehicle.quantity > 0 ? "Purchase" : "Out of stock"}</button>
                    {isAdmin && <div className="admin-actions">
                      <button type="button" onClick={() => { setEditingId(vehicle.id); setVehicleForm({ make: vehicle.make, model: vehicle.model, category: vehicle.category, price: String(vehicle.price), quantity: String(vehicle.quantity) }); }}>Edit</button>
                      <button type="button" onClick={() => adminAction(vehicle.id, "")}>Delete</button>
                      <label>Restock quantity<input aria-label={`Restock quantity for ${vehicle.make} ${vehicle.model}`} type="number" min="1" value={restockAmounts[vehicle.id] ?? "1"} onChange={(event) => setRestockAmounts({ ...restockAmounts, [vehicle.id]: event.target.value })} /></label>
                      <button type="button" onClick={() => adminAction(vehicle.id, "/restock", { quantity: Number(restockAmounts[vehicle.id] ?? 1) })}>Restock</button>
                    </div>}
                  </div>
                </article>
              ))}
            </div>
          ) : !inventoryError ? (
            <div className="empty-state"><CarFront size={34} /><h2>No vehicles found</h2><p>Check back soon or adjust your search.</p></div>
          ) : null}
        </section>}
      </main>
    );
  }

  return (
      <main className="auth-layout min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-icon auth-brand"><CarFront size={24} /></div>
        <span className="eyebrow">MOTORHAUS / INVENTORY</span>
        <h1 id="auth-title">{mode === "login" ? "Find your next drive." : "Join the road ahead."}</h1>
        <p className="intro">A considered collection of vehicles, ready for wherever the road leads.</p>
        <form className="auth-form grid gap-[10px] mt-8" onSubmit={submitAccount}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 10 : undefined}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
        <p className="mode-switch">
          {mode === "login" ? "New to Motorhaus?" : "Already have an account?"}
          <button
            className="text-button"
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </section>
      <aside className="auth-visual" aria-label="Motorhaus vehicle collection">
        <div className="visual-sun" />
        <div className="visual-car"><CarFront size={230} strokeWidth={0.65} /></div>
        <div className="visual-caption">
          <span>CURATED FOR THE WAY YOU MOVE</span>
          <h2>Good things<br />are in motion.</h2>
          <p>Discover the drive that feels like you.</p>
        </div>
      </aside>
    </main>
  );
}
