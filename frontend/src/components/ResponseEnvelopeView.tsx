import type { ResponseEnvelope } from "../types/contracts";

type ResponseEnvelopeViewProps = {
  response: ResponseEnvelope | null;
};

export default function ResponseEnvelopeView({
  response,
}: ResponseEnvelopeViewProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Last Dispatch Response</h3>
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
