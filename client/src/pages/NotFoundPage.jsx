import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { Button } from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <div className="not-found">
      <div className="not-found-orbit" aria-hidden="true" />
      <span className="eyebrow">Error 404</span>
      <h1>Lost between universes.</h1>
      <p>
        This coordinate does not exist in the ANIMEVERSE index. The page may have moved, or the
        link is incomplete.
      </p>
      <div className="not-found-actions">
        <Link to="/">
          <Button icon={Compass}>Return to dashboard</Button>
        </Link>
        <Link to="/characters">
          <Button variant="secondary">Browse characters</Button>
        </Link>
      </div>
      <span className="not-found-code" aria-hidden="true">404</span>
    </div>
  );
}
