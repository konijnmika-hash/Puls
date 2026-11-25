import type { HealthNote } from '../lib/health';

/** Toont waarschuwingen over gezondheid: rood als het echt niet gezond is, oranje om op te letten. */
export function HealthNotes({ notes }: { notes: HealthNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="stack tight" role="status">
      {notes.map((n) => (
        <div key={n.id} className={'health-note ' + n.level}>
          <b>{n.title}</b>
          <p>{n.text}</p>
        </div>
      ))}
    </div>
  );
}
