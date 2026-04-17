type CatalogAgent = {
  id: string;
  name: string;
  tools: string[];
};

type CatalogPanelProps = {
  agents: CatalogAgent[];
};

export default function CatalogPanel({ agents }: CatalogPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Tools Catalog</h3>
      {agents.length === 0 ? (
        <p>Catalog not loaded yet.</p>
      ) : (
        <ul>
          {agents.map((agent) => (
            <li key={agent.id} style={{ marginBottom: 12 }}>
              <strong>{agent.name}</strong>
              <div>ID: {agent.id}</div>
              <div>Tools: {agent.tools.join(", ")}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
