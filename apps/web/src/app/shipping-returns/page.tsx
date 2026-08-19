import Link from 'next/link';
import { getSettings } from '@/lib/settings';

export default async function ShippingReturnsPage() {
  const settings = await getSettings();
  const brand = settings.siteName || 'Drikon';

  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--fg-muted)] mb-3">
          Delivery &amp; policy
        </div>
        <h1 className="display text-4xl md:text-5xl">Shipping &amp; Returns</h1>
      </div>

      <div className="space-y-12 text-[color:var(--fg-muted)] leading-relaxed">
        <Section title="Shipping">
          <p>
            Every order is dispatched within 24 hours and ships with tracking, nationwide. Shipping is free on
            orders of ৳3,000 or more; orders below that ship for a flat ৳60.
          </p>
          <p>
            You&apos;ll get a tracking link by email once your order leaves our warehouse, and you can always check
            an order&apos;s status from your account&apos;s{' '}
            <Link href="/orders" className="underline hover:text-[color:var(--fg)]">
              order history
            </Link>
            .
          </p>
        </Section>

        <Section title="Payment methods">
          <p>
            We currently accept <strong className="text-[color:var(--fg)]">bKash (Send Money)</strong> and{' '}
            <strong className="text-[color:var(--fg)]">Cash on Delivery</strong>. For bKash, send the order total to
            the number shown at checkout and enter the Transaction ID — our team verifies it manually, usually within
            a few hours, and you&apos;ll see the update on your order page. For Cash on Delivery, simply pay when
            your order arrives.
          </p>
        </Section>

        <Section title="Returns">
          <p>
            If something isn&apos;t right, you can return it within <strong className="text-[color:var(--fg)]">14
            days</strong> of delivery for a full refund or exchange, as long as the item is unused, in its original
            packaging, and includes all accessories it shipped with.
          </p>
          <p>
            To start a return, contact us at{' '}
            <a href="/contact" className="underline hover:text-[color:var(--fg)]">
              our support email
            </a>{' '}
            with your order number. We&apos;ll confirm the details and arrange pickup or drop-off.
          </p>
        </Section>

        <Section title="Refunds">
          <p>
            Once we receive and inspect a returned item, refunds are issued to the original payment method — back
            to your bKash account for bKash orders, or by bank transfer/mobile wallet for Cash on Delivery orders,
            arranged with our support team. Refunds are typically processed within 5-7 business days of approval.
          </p>
        </Section>

        <Section title="Warranty">
          <p>
            Every device sold on {brand} is genuine and covered by its official manufacturer warranty. Warranty
            claims are handled directly through the manufacturer&apos;s local service channel; we&apos;re happy to
            help you get started — just reach out.
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
