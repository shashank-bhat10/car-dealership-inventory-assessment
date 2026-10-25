import React from "react";
import PropTypes from "prop-types";
import { CarFront } from "lucide-react";
import AdminVehicleForm from "./AdminVehicleForm.jsx";
import VehicleCard from "./VehicleCard.jsx";

const filterFields = [["Make", "make"], ["Model", "model"], ["Category", "category"], ["Minimum price", "min_price"], ["Maximum price", "max_price"]];

export default function InventoryScreen({ vehicles, isAdmin, loading, error, notice, filters, formValues, editing, restockAmounts, onFilterChange, onVehicleFormChange, onSearch, onSave, onCancelEdit, onRetry, onNavigate, onPurchase, onEdit, onDelete, onRestockChange, onRestock }) {
  return (
    <section id="inventory" className="page-content">
      <span className="eyebrow">THE MOTORHAUS COLLECTION</span>
      <div className="inventory-heading"><div><h1 tabIndex="-1">Available vehicles</h1><p>Your next drive starts here.</p></div><span className="inventory-count">{String(vehicles.length).padStart(2, "0")}</span></div>
      <form className="filters" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        {filterFields.map(([label, key]) => <label key={key}>{label}<input aria-label={label} type={key.includes("price") ? "number" : "search"} min={key.includes("price") ? "0" : undefined} value={filters[key]} onChange={(event) => onFilterChange(key, event.target.value)} /></label>)}
        <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit">Search inventory</button>
      </form>
      {isAdmin && <AdminVehicleForm editing={editing} values={formValues} onChange={onVehicleFormChange} onSubmit={onSave} onCancel={onCancelEdit} />}
      {error && <div className="inventory-error"><p className="error-message" role="alert">{error}</p><button type="button" onClick={onRetry}>Retry inventory load</button></div>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status" className="state-message">Loading the collection…</p> : vehicles.length > 0 ? (
        <div className="vehicle-grid">{vehicles.map((vehicle, index) => <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} isAdmin={isAdmin} restockAmount={restockAmounts[vehicle.id] ?? "1"} onNavigate={onNavigate} onPurchase={onPurchase} onEdit={onEdit} onDelete={onDelete} onRestockChange={onRestockChange} onRestock={onRestock} />)}</div>
      ) : !error ? <div className="empty-state"><CarFront size={34} /><h2>No vehicles found</h2><p>Check back soon or adjust your search.</p></div> : null}
    </section>
  );
}

InventoryScreen.propTypes = {
  vehicles: PropTypes.arrayOf(PropTypes.object).isRequired,
  isAdmin: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  notice: PropTypes.string.isRequired,
  filters: PropTypes.objectOf(PropTypes.string).isRequired,
  formValues: PropTypes.objectOf(PropTypes.string).isRequired,
  editing: PropTypes.bool.isRequired,
  restockAmounts: PropTypes.objectOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onVehicleFormChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onPurchase: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRestockChange: PropTypes.func.isRequired,
  onRestock: PropTypes.func.isRequired,
};
