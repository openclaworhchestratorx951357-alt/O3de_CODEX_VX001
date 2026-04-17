type LayoutHeaderProps = {
  title: string;
  subtitle: string;
};

export default function LayoutHeader({ title, subtitle }: LayoutHeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid #d0d7de",
        paddingBottom: 16,
        marginBottom: 24,
      }}
    >
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p style={{ margin: "8px 0 0 0" }}>{subtitle}</p>
    </header>
  );
}
