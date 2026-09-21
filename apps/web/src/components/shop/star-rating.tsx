import { Star } from 'lucide-react';

/**
 * Five-star rating with partial fill, e.g. 4.3 renders four full stars and a
 * 30%-filled fifth. The visible stars are decorative; the accessible label
 * carries the actual number.
 */
export function StarRating({
  value,
  count,
  size = 13,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5${count !== undefined ? `, ${count} reviews` : ''}`}
    >
      <span className="relative inline-flex" aria-hidden>
        <span className="flex text-[#d0d5dd]">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} style={{ width: size, height: size }} className="fill-current" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-[color:var(--color-star)]"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} style={{ width: size, height: size }} className="fill-current shrink-0" />
          ))}
        </span>
      </span>
      {count !== undefined && <span className="text-[11.5px] text-[color:var(--fg-muted)]">({count})</span>}
    </span>
  );
}
