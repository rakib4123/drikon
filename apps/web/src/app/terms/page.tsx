import { getSettings } from '@/lib/settings';

export default async function TermsPage() {
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
        <h1 className="display text-4xl md:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">Last updated {updated}</p>
      </div>

      <div className="space-y-10 text-[color:var(--fg-muted)] leading-relaxed">
        <Section title="1. Acceptance of these terms">
          <p>
            By creating an account, placing an order, or otherwise using {brand}, you agree to these Terms of
            Service. If you don&apos;t agree with any part of them, please don&apos;t use the site.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You&apos;re responsible for keeping your account credentials confidential and for all activity under
            your account. We support two-factor authentication and recommend enabling it. Let us know immediately
            if you suspect unauthorized access.
          </p>
        </Section>

        <Section title="3. Products and pricing">
          <p>
            All prices are listed in Bangladeshi Taka (৳) and may change without notice. We make a reasonable effort
            to keep product listings, stock levels, and pricing accurate, but errors can happen — if a listing is
            mispriced or a product turns out to be unavailable after you order it, we&apos;ll contact you before
            processing the order.
          </p>
        </Section>

        <Section title="4. Orders and payment">
          <p>
            Placing an order is an offer to buy at the listed price. We currently accept payment via{' '}
            <strong className="text-[color:var(--fg)]">bKash (Send Money)</strong>, which is verified manually
            against a submitted Transaction ID, and{' '}
            <strong className="text-[color:var(--fg)]">Cash on Delivery</strong>. Submitting a Transaction ID that
            doesn&apos;t correspond to a genuine payment, or refusing a Cash on Delivery order without cause, may
            result in the order being cancelled and, for repeated cases, your account being restricted.
          </p>
        </Section>

        <Section title="5. Shipping, returns, and refunds">
          <p>
            Delivery timelines, our 14-day return window, and how refunds are processed are covered in full on our{' '}
            <a href="/shipping-returns" className="underline hover:text-[color:var(--fg)]">
              Shipping &amp; Returns
            </a>{' '}
            page, which forms part of these Terms.
          </p>
        </Section>

        <Section title="6. Product authenticity and warranty">
          <p>
            Every product we sell is genuine and sourced through official channels. Manufacturer warranties, where
            applicable, are honored through the manufacturer&apos;s own service channels — we&apos;re happy to help
            you start a claim.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            {brand} is provided on an &ldquo;as available&rdquo; basis. To the extent permitted by law, we aren&apos;t
            liable for indirect, incidental, or consequential damages arising from your use of the site or your
            purchase of a product, beyond the value of the order itself.
          </p>
        </Section>

        <Section title="8. Governing law">
          <p>These Terms are governed by the laws of Bangladesh.</p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these Terms from time to time. If we make a material change, we&apos;ll update the
            &ldquo;last updated&rdquo; date above. Continuing to use {brand} after a change means you accept the
            updated terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these Terms? Reach us at{' '}
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
