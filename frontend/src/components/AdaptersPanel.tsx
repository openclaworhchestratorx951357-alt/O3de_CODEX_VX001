import type { AdaptersResponse } from "../types/contracts";

type AdaptersPanelProps = {
  adapters: AdaptersResponse | null;
  loading: boolean;
  error: string | null;
};

export default function AdaptersPanel(
  { adapters, loading, error }: AdaptersPanelProps,
) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2>Adapter Registry</h2>
      <p style={{ marginTop: 0, color: "#555" }}>
        Read-only adapter registry view. Control-plane bookkeeping is real, but
        O3DE execution remains explicitly simulated until real adapters are
        implemented.
      </p>
      {loading ? <p>Loading adapter registry...</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {!loading && !error && !adapters ? <p>No adapter registry data available.</p> : null}
      {adapters ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <p><strong>Configured mode:</strong> {adapters.configured_mode}</p>
          <p><strong>Active mode:</strong> {adapters.active_mode}</p>
          <p><strong>Contract version:</strong> {adapters.contract_version}</p>
          <p><strong>Supported modes:</strong> {adapters.supported_modes.join(", ") || "none"}</p>
          <p><strong>Real execution enabled:</strong> {adapters.supports_real_execution ? "yes" : "no"}</p>
          <p><strong>Warning:</strong> {adapters.warning ?? "none"}</p>
          <p><strong>Boundary:</strong> {adapters.families[0]?.execution_boundary ?? "No adapter boundary reported."}</p>
          {adapters.notes.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <strong>Notes</strong>
              <ul>
                {adapters.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <strong>Registered families</strong>
            {adapters.families.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No adapter families are registered.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  marginTop: 12,
                }}
              >
                {adapters.families.map((family) => (
                  <article
                    key={family.family}
                    style={{
                      border: "1px solid #e3e3e3",
                      borderRadius: 8,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>{family.family}</h3>
                    <p><strong>Mode:</strong> {family.mode}</p>
                    <p><strong>Ready:</strong> {family.ready ? "yes" : "no"}</p>
                    <p><strong>Real execution:</strong> {family.supports_real_execution ? "yes" : "no"}</p>
                    <p><strong>Contract:</strong> {family.contract_version}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
