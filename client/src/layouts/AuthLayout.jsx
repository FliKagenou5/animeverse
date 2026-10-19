import { Images, Layers3, ShieldCheck, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/brand/Logo.jsx';

const FEATURES = [
  { icon: Layers3, title: 'One universe index', text: 'Characters, tiers and series connected in a single local database.' },
  { icon: Swords, title: 'Transparent battles', text: 'Weighted comparisons with visible inputs, never a black-box verdict.' },
  { icon: Images, title: 'Art beyond canon', text: 'An original concept gallery built for the demo, clearly attributed.' },
];

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
        <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
        <div className="auth-visual-content">
          <Logo />
          <div className="auth-tagline">
            <p className="eyebrow">Explore the infinite</p>
            <h1>
              Every legend,
              <br />
              <span className="gradient-text">one universe.</span>
            </h1>
            <p>
              ANIMEVERSE is a local-first encyclopedia for characters, scaling notes, battles, tier
              lists and original concept art.
            </p>
          </div>
          <div className="auth-features">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="auth-feature">
                  <span aria-hidden="true"><Icon size={16} /></span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="auth-disclaimer">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Community interpretation data. Not affiliated with rights holders.</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
        </div>
        {footer ? <div className="auth-footer">{footer}</div> : null}
        <p className="auth-legal">
          Local demo build · <Link to="/settings">Data notes</Link>
        </p>
      </section>
    </div>
  );
}
