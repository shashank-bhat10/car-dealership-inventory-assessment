import React, { useCallback, useEffect, useRef, useState } from "react";
import { CarFront } from "lucide-react";
import AuthScreen from "./components/AuthScreen.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import InventoryScreen from "./components/InventoryScreen.jsx";
import PurchaseHistory from "./components/PurchaseHistory.jsx";
import VehicleDetails from "./components/VehicleDetails.jsx";
import { apiRequest } from "./services/api.js";

const emptyVehicleForm = () => ({ make: "", model: "", category: "", price: "", quantity: "" });
const purchasePageSize = 50;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") ?? "");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("is_admin") === "true");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [filters, setFilters] = useState({ make: "", model: "", category: "", min_price: "", max_price: "" });
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [restockAmounts, setRestockAmounts] = useState({});
  const [pathname, setPathname] = useState(window.location.pathname);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmationError, setConfirmationError] = useState("");
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const confirmationInFlight = useRef(false);
  const historyOffset = useRef(0);
  const historyRequestId = useRef(0);

  function clearPurchaseHistory() {
    historyRequestId.current += 1;
    historyOffset.current = 0;
    setPurchaseRecords([]);
    setHistoryError("");
    setHistoryHasMore(false);
    setHistoryLoading(false);
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    setPathname(path);
    setNotice("");
    setDetailError("");
    setInventoryError("");
  }

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadVehicles = useCallback(async (selected = {}) => {
    setLoading(true);
    setInventoryError("");
    try {
      const query = new URLSearchParams(Object.entries(selected).filter(([, value]) => value !== ""));
      setVehicles(await apiRequest(`/api/vehicles${query.size ? `?${query}` : ""}`, {}, token));
    } catch (error) {
      setInventoryError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadVehicle = useCallback(async (vehicleId) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetailVehicle(await apiRequest(`/api/vehicles/${vehicleId}`, {}, token));
    } catch (error) {
      setDetailVehicle(null);
      setDetailError(error.message);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  const loadPurchaseHistory = useCallback(async ({ append = false } = {}) => {
    const offset = append ? historyOffset.current : 0;
    const requestId = ++historyRequestId.current;
    setHistoryLoading(true);
    setHistoryError("");
    const endpoint = isAdmin ? "/api/admin/purchases" : "/api/purchases";
    try {
      const result = await apiRequest(`${endpoint}?limit=${purchasePageSize}&offset=${offset}`, {}, token);
      if (requestId !== historyRequestId.current) return;
      setPurchaseRecords((current) => append ? [...current, ...result] : result);
      historyOffset.current = offset + result.length;
      setHistoryHasMore(result.length === purchasePageSize);
    } catch (error) {
      if (requestId === historyRequestId.current) setHistoryError(error.message);
    } finally {
      if (requestId === historyRequestId.current) setHistoryLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (!token) return;
    const match = pathname.match(/^\/vehicles\/(\d+)\/?$/);
    if (match) loadVehicle(Number(match[1]));
    else if (pathname === "/purchases") loadPurchaseHistory();
    else loadVehicles();
  }, [token, pathname, loadVehicle, loadVehicles, loadPurchaseHistory]);

  async function submitAccount(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      if (mode === "register") {
        await apiRequest("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("is_admin", String(Boolean(result.is_admin)));
      localStorage.setItem("account_email", email);
      clearPurchaseHistory();
      setToken(result.access_token);
      setIsAdmin(Boolean(result.is_admin));
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function purchase(vehicleId) {
    setNotice("");
    await apiRequest(`/api/vehicles/${vehicleId}/purchase`, { method: "POST" }, token);
    setNotice("Inventory purchase recorded. No payment was processed.");
    if (pathname.startsWith("/vehicles/")) await loadVehicle(vehicleId);
    else await loadVehicles(filters);
  }

  async function deleteVehicle(vehicleId) {
    await apiRequest(`/api/vehicles/${vehicleId}`, { method: "DELETE" }, token);
    navigate("/");
    setNotice("Vehicle deleted.");
    await loadVehicles(filters);
  }

  async function saveVehicle(event) {
    event.preventDefault();
    try {
      await apiRequest(editingId ? `/api/vehicles/${editingId}` : "/api/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vehicleForm, price: Number(vehicleForm.price), quantity: Number(vehicleForm.quantity) }),
      }, token);
      setNotice(editingId ? "Vehicle updated." : "Vehicle added.");
      const editedId = editingId;
      setEditingId(null);
      setVehicleForm(emptyVehicleForm());
      if (pathname.startsWith("/vehicles/")) await loadVehicle(editedId);
      else await loadVehicles(filters);
    } catch (error) {
      setInventoryError(error.message);
    }
  }

  async function adminAction(vehicleId, action, body) {
    try {
      await apiRequest(`/api/vehicles/${vehicleId}${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, token);
      setNotice("Vehicle restocked.");
      if (pathname.startsWith("/vehicles/")) await loadVehicle(vehicleId);
      else await loadVehicles(filters);
    } catch (error) {
      setInventoryError(error.message);
    }
  }

  function openConfirmation(action, vehicle) {
    setConfirmation({ action, vehicle });
    setConfirmationError("");
  }

  const cancelConfirmation = useCallback(() => {
    if (confirmationInFlight.current) return;
    setConfirmation(null);
    setConfirmationError("");
  }, []);

  async function confirmAction() {
    if (!confirmation || confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    setConfirmationBusy(true);
    setConfirmationError("");
    try {
      if (confirmation.action === "purchase") await purchase(confirmation.vehicle.id);
      else await deleteVehicle(confirmation.vehicle.id);
      setConfirmation(null);
    } catch (error) {
      setConfirmationError(error.message || "The action could not be completed. Please try again.");
    } finally {
      confirmationInFlight.current = false;
      setConfirmationBusy(false);
    }
  }

  function editVehicle(vehicle) {
    setEditingId(vehicle.id);
    setVehicleForm({ make: vehicle.make, model: vehicle.model, category: vehicle.category, price: String(vehicle.price), quantity: String(vehicle.quantity) });
  }

  function updateVehicleForm(key, value) {
    setVehicleForm((current) => ({ ...current, [key]: value }));
  }

  function cancelEdit() {
    setEditingId(null);
    setVehicleForm(emptyVehicleForm());
  }

  function updateRestockAmount(vehicleId, value) {
    setRestockAmounts((current) => ({ ...current, [vehicleId]: value }));
  }

  if (!token) {
    return <AuthScreen mode={mode} email={email} password={password} busy={busy} error={authError} onSubmit={submitAccount} onChangeMode={() => { setMode(mode === "login" ? "register" : "login"); setAuthError(""); }} onEmailChange={setEmail} onPasswordChange={setPassword} />;
  }

  const vehicleRoute = pathname.match(/^\/vehicles\/(\d+)\/?$/);
  const historyRoute = pathname === "/purchases";
  return (
    <main className="app-shell mx-auto w-full">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}><span className="brand-icon"><CarFront size={21} /></span><span>MOTORHAUS<small>DRIVE YOUR WAY</small></span></a>
        <div className="account-summary">
          {isAdmin && <span className="role-pill">Administrator</span>}
          <button type="button" className="text-button" onClick={() => navigate("/purchases")}>{isAdmin ? "Purchase History" : "My Purchases"}</button>
          <span>{localStorage.getItem("account_email")}</span>
          <button className="text-button" onClick={() => { localStorage.clear(); clearPurchaseHistory(); setToken(""); setIsAdmin(false); navigate("/"); }}>Sign out</button>
        </div>
      </header>
      {historyRoute ? (
        <PurchaseHistory isAdmin={isAdmin} records={purchaseRecords} loading={historyLoading} error={historyError} hasMore={historyHasMore} onBack={() => navigate("/")} onRetry={() => loadPurchaseHistory()} onLoadMore={() => loadPurchaseHistory({ append: true })} />
      ) : vehicleRoute ? (
        <VehicleDetails vehicle={detailVehicle} isAdmin={isAdmin} loading={detailLoading} error={detailError || inventoryError} notice={notice} editing={editingId === detailVehicle?.id} values={vehicleForm} restockAmount={restockAmounts[detailVehicle?.id] ?? "1"} onBack={() => navigate("/")} onRetry={() => loadVehicle(Number(vehicleRoute[1]))} onPurchase={(vehicle) => openConfirmation("purchase", vehicle)} onEdit={editVehicle} onChange={updateVehicleForm} onSave={saveVehicle} onCancel={cancelEdit} onDelete={(vehicle) => openConfirmation("delete", vehicle)} onRestockChange={updateRestockAmount} onRestock={(id, quantity) => adminAction(id, "/restock", { quantity })} />
      ) : (
        <InventoryScreen vehicles={vehicles} isAdmin={isAdmin} loading={loading} error={inventoryError} notice={notice} filters={filters} formValues={vehicleForm} editing={editingId !== null} restockAmounts={restockAmounts} onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onVehicleFormChange={updateVehicleForm} onSearch={() => loadVehicles(filters)} onSave={saveVehicle} onCancelEdit={cancelEdit} onRetry={() => loadVehicles(filters)} onNavigate={navigate} onPurchase={(vehicle) => openConfirmation("purchase", vehicle)} onEdit={editVehicle} onDelete={(vehicle) => openConfirmation("delete", vehicle)} onRestockChange={updateRestockAmount} onRestock={(id, quantity) => adminAction(id, "/restock", { quantity })} />
      )}
      {confirmation && <ConfirmDialog action={confirmation.action} vehicle={confirmation.vehicle} busy={confirmationBusy} error={confirmationError} onCancel={cancelConfirmation} onConfirm={confirmAction} />}
    </main>
  );
}
