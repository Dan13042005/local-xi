type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>{title}</h1>
      {subtitle ? <p className="tagline">{subtitle}</p> : null}
    </header>
  );
}
