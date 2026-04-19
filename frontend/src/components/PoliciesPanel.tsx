import type { ToolPolicy } from "../types/contracts";

type PoliciesPanelProps = {
  items: ToolPolicy[];
  loading: boolean;
  error: string | null;
};

export default function PoliciesPanel({
  items,
  loading,
  error,
}: PoliciesPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Policies</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These policy records describe approval, lock, and execution guardrails.
        Execution mode and capability status remain explicitly labeled,
        including simulated, plan-only, and mutation-candidate tool surfaces.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading policies...</p>
      ) : items.length === 0 ? (
        <p>No policies published yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${item.agent}:${item.tool}`} style={{ marginBottom: 12 }}>
              <strong>{item.tool}</strong>
              <div>Agent: {item.agent}</div>
              <div>Approval class: {item.approval_class}</div>
              <div>Capability: {item.capability_status}</div>
              <div>Admission stage: {item.real_admission_stage}</div>
              <div>Requires approval: {String(item.requires_approval)}</div>
              <div>Required locks: {item.required_locks.join(", ") || "none"}</div>
              <div>Risk: {item.risk}</div>
              <div>Execution mode: {item.execution_mode}</div>
              <div>Next requirement: {item.next_real_requirement}</div>
              {item.tool === "build.configure" ? (
                <div>
                  Meaning: In hybrid mode this remains plan-only. Approval can
                  enable a real preflight path, but not a real configure mutation.
                </div>
              ) : null}
              {item.tool === "settings.patch" ? (
                <div>
                  Meaning: This is the first recommended mutation candidate, but it
                  remains simulated until backup, rollback, and failure-visible
                  patch-plan gates are explicitly admitted.
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
