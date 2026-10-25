import React from "react";
import PropTypes from "prop-types";

function formatPrice(price) {
  return Number(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseHistory({ isAdmin, records, loading, error, hasMore, onBack, onRetry, onLoadMore }) {
  return (
    <section className="page-content purchase-history" aria-labelledby="purchase-history-title">
      <button type="button" className="text-button back-link" onClick={onBack}>← Back to inventory</button>
      <span className="eyebrow">SIMULATED INVENTORY RECORDS</span>
      <h1 id="purchase-history-title">{isAdmin ? "Purchase History" : "My Purchases"}</h1>
      <p>Simulated inventory records only. No payment is processed.</p>
      {loading && <p role="status" className="state-message">Loading purchase history…</p>}
      {error && <div className="inventory-error"><p role="alert" className="error-message">{error}</p><button type="button" onClick={onRetry}>Retry purchase history</button></div>}
      {!loading && !error && records.length === 0 && <div className="empty-state"><h2>No simulated purchases yet</h2><p>Inventory purchases you make will appear here.</p></div>}
      {records.length > 0 && <div className="purchase-history-list">
        {records.map((record) => (
          <article key={record.id} className="purchase-record">
            <span className="vehicle-category">SIMULATED INVENTORY RECORD</span>
            <h2>{record.make} {record.model}</h2>
            <dl className="purchase-record-details">
              {isAdmin && <div><dt>Purchaser</dt><dd>{record.purchaser_email}</dd></div>}
              <div><dt>Unit price at purchase</dt><dd>${formatPrice(record.unit_price)}</dd></div>
              <div><dt>Recorded</dt><dd><time dateTime={record.purchased_at}>{new Date(record.purchased_at).toLocaleString()}</time></dd></div>
              <div><dt>Vehicle link</dt><dd>{record.vehicle_id === null ? "Vehicle listing deleted; saved purchase details remain." : `Vehicle #${record.vehicle_id}`}</dd></div>
            </dl>
          </article>
        ))}
      </div>}
      {hasMore && !loading && <button type="button" className="primary-button history-load-more" onClick={onLoadMore}>Load more purchases</button>}
    </section>
  );
}

PurchaseHistory.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
  records: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, purchaser_email: PropTypes.string.isRequired, vehicle_id: PropTypes.number, make: PropTypes.string.isRequired, model: PropTypes.string.isRequired, unit_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, purchased_at: PropTypes.string.isRequired })).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  hasMore: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
};
