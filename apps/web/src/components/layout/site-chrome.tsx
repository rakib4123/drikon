'use client';

import { usePathname } from 'next/navigation';

/**
 * Shows the storefront's header and footer everywhere except the admin panel,
 * which has its own sidebar and top bar. The chrome itself stays server-rendered
 * and is passed in as props; this only decides whether to show it.
 */
export function SiteChrome({
  header,
  footer,
  extras,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  /** Storefront-only floating UI, e.g. the compare tray. */
  extras?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isAdmin = usePathname().startsWith('/admin');
  if (isAdmin) return <main id="main" className="flex-1">{children}</main>;
  return (
    <>
      {header}
      <main id="main" className="flex-1">{children}</main>
      {footer}
      {extras}
    </>
  );
}
