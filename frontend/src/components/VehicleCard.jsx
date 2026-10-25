import React from "react";
import PropTypes from "prop-types";
import { CarFront } from "lucide-react";

export default function VehicleCard({ vehicle, index, isAdmin, restockAmount, onNavigate, onPurchase, onEdit, onDelete, onRestockChange, onRestock }) {
  return (
    <article className="vehicle-card">
      <div className={`vehicle-art vehicle-art-${index % 3}`} aria-hidden="true"><CarFront size={110} strokeWidth={0.8} /></div>
      <div className="vehicle-details">
        <span className="vehicle-category">{vehicle.category}</span>
        <h2><a href={`/vehicles/${vehicle.id}`} onClick={(event) => { event.preventDefault(); onNavigate(`/vehicles/${vehicle.id}`); }}>{vehicle.make} {vehicle.model}</a></h2>
        <strong>${Number(vehicle.price).toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
        <span className={vehicle.quantity > 0 ? "stock-label" : "stock-label sold-out"}>{vehicle.quantity > 0 ? `${vehicle.quantity} in stock` : "Out of stock"}</span>
        <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" disabled={vehicle.quantity === 0} onClick={() => onPurchase(vehicle)}>{vehicle.quantity > 0 ? "Purchase" : "Out of stock"}</button>
        {isAdmin && <div className="admin-actions">
          <button type="button" onClick={() => onEdit(vehicle)}>Edit</button>
          <button type="button" onClick={() => onDelete(vehicle)}>Delete</button>
          <label>Restock quantity<input aria-label={`Restock quantity for ${vehicle.make} ${vehicle.model}`} type="number" min="1" value={restockAmount} onChange={(event) => onRestockChange(vehicle.id, event.target.value)} /></label>
          <button type="button" onClick={() => onRestock(vehicle.id, Number(restockAmount))}>Restock</button>
        </div>}
      </div>
    </article>
  );
}

VehicleCard.propTypes = {
  vehicle: PropTypes.shape({ id: PropTypes.number.isRequired, make: PropTypes.string.isRequired, model: PropTypes.string.isRequired, category: PropTypes.string.isRequired, price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, quantity: PropTypes.number.isRequired }).isRequired,
  index: PropTypes.number.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  restockAmount: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onPurchase: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRestockChange: PropTypes.func.isRequired,
  onRestock: PropTypes.func.isRequired,
};
