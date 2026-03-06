type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="tagline">{subtitle}</p> : null}
        </div>

        <div className="header-badge">
          ⚽ Team Manager
        </div>
      </div>
    </header>
  );
}
