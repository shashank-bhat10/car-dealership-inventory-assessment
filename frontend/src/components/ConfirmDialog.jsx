import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

export default function ConfirmDialog({ action, vehicle, busy, error, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const isPurchase = action === "purchase";

  useEffect(() => {
    const opener = document.activeElement;
    cancelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const target = opener?.isConnected ? opener : document.querySelector(".page-content h1");
      target?.focus?.();
    };
  }, [onCancel]);

  const price = Number(vehicle.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="dialog-backdrop">
      <section ref={dialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <h2 id="confirm-title">{isPurchase ? "Confirm simulated purchase" : "Confirm vehicle deletion"}</h2>
        <p id="confirm-description">
          {isPurchase
            ? `Purchase ${vehicle.make} ${vehicle.model} for $${price}? This demo action only reduces inventory and does not process payment.`
            : `Delete ${vehicle.make} ${vehicle.model}? This deletion cannot be undone from the UI.`}
        </p>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="dialog-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="dialog-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? (isPurchase ? "Processing purchase…" : "Deleting…") : (isPurchase ? "Confirm purchase" : "Delete vehicle")}
          </button>
        </div>
      </section>
    </div>
  );
}

ConfirmDialog.propTypes = {
  action: PropTypes.oneOf(["purchase", "delete"]).isRequired,
  vehicle: PropTypes.shape({ make: PropTypes.string.isRequired, model: PropTypes.string.isRequired, price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
