import type { ReactNode } from 'react';

/**
 * Consistent empty / zero-result state used across the app (catalog, cart,
 * wishlist, compare, admin lists). Icon in a rounded chip, heading, optional
 * description, optional action (pass a <Link> / button).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-soft)] border border-[color:var(--border)] grid place-items-center mx-auto mb-5 text-[color:var(--fg-muted)]">
        {icon}
      </div>
      <h2 className="display text-2xl mb-2">{title}</h2>
      {description && (
        <p className="text-[color:var(--fg-muted)] max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap gap-3 justify-center">{action}</div>}
    </div>
  );
}
