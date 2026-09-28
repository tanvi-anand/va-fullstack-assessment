// Shown instead of the dashboard before any sensor names have loaded.
import { API_BASE_URL } from '../lib/api-client';

interface statusScreenProps {
  kind: 'starting' | 'unreachable';
}

export function StatusScreen({ kind }: statusScreenProps) {
  let title = 'Starting up';
  let message = "The API is running but hasn't loaded sensor names and units from the emulator yet, so it answered 503. The dashboard asks again every 2 seconds and fills in by itself. Nothing to do.";
  let cardClass = 'border-warning/40';
  let titleClass = 'text-warning';
  if (kind === 'unreachable') {
    title = "Can't reach the API";
    message = `Nothing answered at ${API_BASE_URL}. Check the API is running (cd api && npm run dev, or docker compose up). The dashboard keeps trying every 2 seconds.`;
    cardClass = 'border-destructive';
    titleClass = 'text-foreground';
  }

  return (
    <div className={`mx-auto mt-24 max-w-lg rounded-lg border bg-card p-6 ${cardClass}`}>
      <h2 className={`mb-2 text-lg font-semibold ${titleClass}`}>{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
