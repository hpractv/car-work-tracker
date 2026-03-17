export default function Offline() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem", maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📡</div>
      <h1 style={{ marginBottom: "0.5rem" }}>You're Offline</h1>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
        It looks like you're not connected to the internet. Some features may be unavailable.
      </p>
      <p style={{ color: "#64748b", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        Your previously viewed cars and maintenance records may still be accessible from your device's cache.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ background: "#1e40af", color: "white", border: "none", borderRadius: "6px", padding: "0.6rem 1.2rem", cursor: "pointer", fontSize: "0.95rem", fontWeight: 500 }}
      >
        Try Again
      </button>
    </div>
  );
}
