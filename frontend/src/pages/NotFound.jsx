import { Link } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <LogoMark className="mb-6 h-14 w-14 opacity-60" />
      <p className="num text-6xl font-semibold text-ink-700">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold text-ink-100">That page is not on the floor plan</h1>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-500">
        The address may have changed, or the record may have been removed. Head back to the dashboard.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
