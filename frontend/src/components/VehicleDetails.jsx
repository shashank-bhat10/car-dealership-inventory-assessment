import React from "react";
import PropTypes from "prop-types";
import { CarFront } from "lucide-react";
import AdminVehicleForm from "./AdminVehicleForm.jsx";

export default function VehicleDetails({ vehicle, isAdmin, loading, error, notice, editing, values, restockAmount, onBack, onRetry, onPurchase, onEdit, onChange, onSave, onCancel, onDelete, onRestockChange, onRestock }) {
  return (
    <section className="page-content vehicle-page">
      <a className="text-button back-link" href="/" onClick={(event) => { event.preventDefault(); onBack(); }}>← Back to inventory</a>
      {loading && <p role="status" className="state-message">Loading vehicle details…</p>}
      {error && <div className="inventory-error"><p role="alert" className="error-message">{error}</p><button type="button" onClick={onRetry}>Retry vehicle details</button></div>}
      {notice && <p role="status">{notice}</p>}
      {vehicle && <>
        <span className="eyebrow">VEHICLE DETAILS</span>
        <article className="vehicle-detail-card">
          <div className="vehicle-art vehicle-art-0" aria-hidden="true"><CarFront size={140} strokeWidth={0.8} /></div>
          <div className="vehicle-details">
            <span className="vehicle-category">{vehicle.category}</span>
            <h1 tabIndex="-1">{vehicle.make} {vehicle.model}</h1>
            <strong>${Number(vehicle.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
            <dl className="vehicle-specs">
              <div><dt>Make</dt><dd>{vehicle.make}</dd></div>
              <div><dt>Model</dt><dd>{vehicle.model}</dd></div>
              <div><dt>Category</dt><dd>{vehicle.category}</dd></div>
              <div><dt>Price</dt><dd>${Number(vehicle.price).toLocaleString("en-US", { maximumFractionDigits: 2 })}</dd></div>
              <div><dt>Vehicle ID</dt><dd>{vehicle.id}</dd></div>
              <div><dt>Stock</dt><dd>{vehicle.quantity > 0 ? `${vehicle.quantity} in stock` : "Out of stock"}</dd></div>
            </dl>
            <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" disabled={vehicle.quantity === 0} onClick={() => onPurchase(vehicle)}>{vehicle.quantity > 0 ? "Purchase" : "Out of stock"}</button>
            {isAdmin && <section className="admin-actions" aria-label="Administrator vehicle actions">
              {editing ? <AdminVehicleForm editing values={values} onChange={onChange} onSubmit={onSave} onCancel={onCancel} /> : <button type="button" onClick={() => onEdit(vehicle)}>Edit</button>}
              <button type="button" onClick={() => onDelete(vehicle)}>Delete</button>
              <label>Restock quantity<input aria-label={`Restock quantity for ${vehicle.make} ${vehicle.model}`} type="number" min="1" value={restockAmount} onChange={(event) => onRestockChange(vehicle.id, event.target.value)} /></label>
              <button type="button" onClick={() => onRestock(vehicle.id, Number(restockAmount))}>Restock</button>
            </section>}
          </div>
        </article>
      </>}
    </section>
  );
}

VehicleDetails.propTypes = {
  vehicle: PropTypes.shape({ id: PropTypes.number.isRequired, make: PropTypes.string.isRequired, model: PropTypes.string.isRequired, category: PropTypes.string.isRequired, price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, quantity: PropTypes.number.isRequired }),
  isAdmin: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  notice: PropTypes.string.isRequired,
  editing: PropTypes.bool.isRequired,
  values: PropTypes.objectOf(PropTypes.string).isRequired,
  restockAmount: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onPurchase: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRestockChange: PropTypes.func.isRequired,
  onRestock: PropTypes.func.isRequired,
};
