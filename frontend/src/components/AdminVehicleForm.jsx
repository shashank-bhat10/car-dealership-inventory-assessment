const fields = [
  ["Vehicle make", "make", "text"],
  ["Vehicle model", "model", "text"],
  ["Vehicle category", "category", "text"],
  ["Vehicle price", "price", "number"],
  ["Vehicle quantity", "quantity", "number"],
];

export default function AdminVehicleForm({ editing, values, onChange, onSubmit, onCancel }) {
  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <h2>{editing ? "Update vehicle" : "Add a vehicle"}</h2>
      {fields.map(([label, key, type]) => (
        <label key={key}>{label}<input aria-label={label} required min={key === "price" ? "0.01" : key === "quantity" ? "0" : undefined} type={type} step={key === "price" ? "0.01" : key === "quantity" ? "1" : undefined} value={values[key]} onChange={(event) => onChange(key, event.target.value)} /></label>
      ))}
      <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit">{editing ? "Save vehicle" : "Add vehicle"}</button>
      {editing && <button type="button" onClick={onCancel}>Cancel edit</button>}
    </form>
  );
}
import React from "react";
import PropTypes from "prop-types";


AdminVehicleForm.propTypes = {
  editing: PropTypes.bool.isRequired,
  values: PropTypes.objectOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
