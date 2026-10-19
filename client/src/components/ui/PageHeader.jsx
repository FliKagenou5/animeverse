export function PageHeader({ eyebrow, title, description, actions, icon: Icon, children }) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {eyebrow ? (
          <div className="eyebrow-row">
            <span className="eyebrow-line" aria-hidden="true" />
            <span className="eyebrow">{eyebrow}</span>
          </div>
        ) : null}
        <div className="page-title-row">
          {Icon ? (
            <span className="page-title-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
          ) : null}
          <h1>{title}</h1>
        </div>
        {description ? <p className="page-description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
