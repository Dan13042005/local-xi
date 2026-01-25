type NavKey = "notices" | "players" | "matches" | "formations";

type NavProps = {
  active: NavKey;
  onChange: (key: NavKey) => void;
};

export function Nav({ active, onChange }: NavProps) {
  const items: { key: NavKey; label: string }[] = [
    { key: "notices", label: "Notices" },
    { key: "players", label: "Players" },
    { key: "matches", label: "Matches" },
    { key: "formations", label: "Formations" },
  ];

  return (
    <nav className="app-nav" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={active === item.key ? "nav-btn active" : "nav-btn"}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
