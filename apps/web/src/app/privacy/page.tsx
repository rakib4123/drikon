import { getSettings } from '@/lib/settings';

export default async function PrivacyPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';
  const email = settings.supportEmail || 'support@drikon.example';
  const updated = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(),
  );

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-14">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-3">Legal</div>
        <h1 className="display text-4xl md:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Last updated {updated}</p>
      </div>

      <div className="space-y-10 text-[color:var(--fg-muted)] leading-relaxed">
        <Section title="What we collect">
          <p>Only what&apos;s needed to run your account and fulfill your orders:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-[color:var(--fg)]">Account info</strong> — name, email, phone, and password
              (or, if you sign in with Google, your Google account&apos;s name/email/avatar — we never see your
              Google password).
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">Order &amp; shipping info</strong> — delivery address,
              order history, and any notes you leave on an order.
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">Payment verification info</strong> — for bKash orders,
              the sender number and Transaction ID you submit. We never collect card numbers, since we don&apos;t
              process card payments — bKash payments are verified manually, and Cash on Delivery involves no
              payment data at all.
            </li>
            <li>
              <strong className="text-[color:var(--fg)]">Security info</strong> — sign-in timestamps, IP address,
              and device/browser info, used to detect suspicious activity on your account.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <p>
            To create and secure your account, process and deliver your orders, verify manual payments, respond
            when you contact support, and send order-related emails (verification, password reset, order updates).
            We don&apos;t use your data for advertising, and {brand} doesn&apos;t run third-party analytics or ad
            tracking on this site.
          </p>
        </Section>

        <Section title="How we protect it">
          <p>
            Passwords are hashed (never stored in plain text) and you can enable two-factor authentication for
            extra protection. Sign-in sessions are stored in httpOnly cookies your browser&apos;s JavaScript
            can&apos;t read. If you ever suspect your account has been accessed without your permission, contact us
            and we can revoke every active session on your behalf.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            We don&apos;t sell your data. Your shipping address is shared with our delivery partners solely to
            deliver your order. Payment verification for bKash orders is handled internally — we don&apos;t send
            your data to a third-party payment processor, since there isn&apos;t one in this flow.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use a small number of essential cookies to keep you signed in and to protect the site from
            cross-site request forgery. We don&apos;t use tracking or advertising cookies.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can review and update most of your account info directly from your account settings. To request a
            copy of your data, ask us to correct something we got wrong, or request account deletion, email us at{' '}
            <a href={`mailto:${email}`} className="underline hover:text-[color:var(--fg)]">
              {email}
            </a>
            .
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make a material change to how we handle your data, we&apos;ll update the &ldquo;last
            updated&rdquo; date above.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data? Reach us at{' '}
            <a href={`mailto:${email}`} className="underline hover:text-[color:var(--fg)]">
              {email}
            </a>
            .
          </p>
        </Section>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display text-xl md:text-2xl text-[color:var(--fg)] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
