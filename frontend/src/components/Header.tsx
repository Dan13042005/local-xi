type HeaderProps = {
  title: string;
  subtitle?: string;
  role?: string | null;
};

export function Header({ title, subtitle, role }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="tagline">{subtitle}</p> : null}
        </div>

        <div className="header-badge">
          ⚽ {role === "PLAYER" ? "Team Player" : "Team Manager"}
        </div>
      </div>
    </header>
  );
}
