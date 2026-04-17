import type { ResponseEnvelope } from "../types/contracts";

type ResponseEnvelopeViewProps = {
  response: ResponseEnvelope | null;
};

export default function ResponseEnvelopeView({
  response,
}: ResponseEnvelopeViewProps) {
  const statusLabel = response ? (response.ok ? "success" : "failure") : "idle";
  const statusColor =
    statusLabel === "success"
      ? "#1a7f37"
      : statusLabel === "failure"
        ? "#cf222e"
        : "#6e7781";

  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Last Dispatch Response</h3>
        <span
          style={{
            background: statusColor,
            color: "white",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </div>
      {response ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}
        >
          {JSON.stringify(response, null, 2)}
        </pre>
      ) : (
        <p>No response received yet.</p>
      )}
    </section>
  );
}
