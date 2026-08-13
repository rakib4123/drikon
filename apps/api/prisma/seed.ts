/**
 * Drikon — seed data
 * Run: pnpm db:seed
 *
 * Creates: admin user, a customer, categories, brands, sample products.
 * All passwords are hashed with the same argon2id parameters as production.
 */
import { PrismaClient, Role, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const argonOpts: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
};

async function main() {
  // Safety: the seed creates an admin with a publicly-known password. Never let
  // that run against a production database unless explicitly forced.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error(
      'Refusing to seed in production (NODE_ENV=production). The seed creates a ' +
        'well-known admin password. Set ALLOW_PROD_SEED=true only if you truly intend ' +
        'to, and rotate the admin password immediately afterward.',
    );
  }

  console.log('🌱 Seeding Drikon database...');

  // ─── Users ───
  // NOTE: this is a DEMO password — rotate it immediately on any real deployment.
  const adminHash = await argon2.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@drikon2026', argonOpts);
  const userHash = await argon2.hash('User@drikon2026', argonOpts);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@drikon.com' },
    update: {},
    create: {
      email: 'admin@drikon.com',
      name: 'Drikon Admin',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'demo@drikon.com' },
    update: {},
    create: {
      email: 'demo@drikon.com',
      name: 'Demo Customer',
      passwordHash: userHash,
      role: Role.USER,
      emailVerified: new Date(),
    },
  });

  console.log(`  ✓ users (admin: ${admin.email}, demo: ${customer.email})`);

  // ─── Categories ───
  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: { name: 'Smartphones', slug: 'smartphones', description: 'Premium flagship devices' },
  });
  const cases = await prisma.category.upsert({
    where: { slug: 'cases' },
    update: {},
    create: { name: 'Cases & Protection', slug: 'cases', description: 'Premium cases, screen protectors' },
  });
  const power = await prisma.category.upsert({
    where: { slug: 'power' },
    update: {},
    create: { name: 'Chargers & Power', slug: 'power', description: 'Fast chargers, MagSafe, power banks' },
  });

  console.log('  ✓ categories');

  // ─── Brands ───
  const apple = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: { name: 'Apple', slug: 'apple' },
  });
  const samsung = await prisma.brand.upsert({
    where: { slug: 'samsung' },
    update: {},
    create: { name: 'Samsung', slug: 'samsung' },
  });
  const spigen = await prisma.brand.upsert({
    where: { slug: 'spigen' },
    update: {},
    create: { name: 'Spigen', slug: 'spigen' },
  });
  const anker = await prisma.brand.upsert({
    where: { slug: 'anker' },
    update: {},
    create: { name: 'Anker', slug: 'anker' },
  });

  console.log('  ✓ brands');

  // ─── Products ───
  const products: Array<Prisma.ProductCreateInput> = [
    {
      name: 'iPhone 15 Pro Titanium',
      slug: 'iphone-15-pro-titanium',
      sku: 'APL-IP15P-256-NT',
      description:
        'Forged in aerospace-grade titanium. Features the A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.',
      shortDescription: 'Aerospace-grade titanium, A17 Pro chip, Pro camera system.',
      price: new Prisma.Decimal(139990),
      compareAtPrice: new Prisma.Decimal(149990),
      stock: 42,
      isFeatured: true,
      category: { connect: { id: smartphones.id } },
      brand: { connect: { id: apple.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800', position: 0, alt: 'iPhone 15 Pro' },
        ],
      },
      attributes: { storage: ['128GB', '256GB', '512GB', '1TB'], color: ['Natural Titanium', 'Blue Titanium', 'Black Titanium'] },
      averageRating: 4.9,
      reviewCount: 312,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      sku: 'SAM-S24U-512-TI',
      description:
        'Welcome to the era of mobile AI. The Galaxy S24 Ultra unleashes new levels of creativity, productivity, and possibility, starting with the most important device in your life.',
      shortDescription: 'Titanium exterior, Galaxy AI, 200MP camera, built-in S Pen.',
      price: new Prisma.Decimal(154990),
      stock: 35,
      isFeatured: true,
      category: { connect: { id: smartphones.id } },
      brand: { connect: { id: samsung.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=800', position: 0, alt: 'Galaxy S24 Ultra' },
        ],
      },
      attributes: { storage: ['256GB', '512GB', '1TB'], color: ['Titanium Gray', 'Titanium Black'] },
      averageRating: 4.8,
      reviewCount: 245,
    },
    {
      name: 'Spigen Core Armor Case',
      slug: 'spigen-core-armor-iphone-15-pro',
      sku: 'SPG-CA-IP15P-MB',
      description:
        'Suit up. The Core Armor provides absolute protection with its signature shock-absorbing design and tactile grip. Keeps your device pristine in every drop.',
      shortDescription: 'Slim shock-absorbing protection, matte black finish.',
      price: new Prisma.Decimal(2490),
      stock: 120,
      isFeatured: false,
      category: { connect: { id: cases.id } },
      brand: { connect: { id: spigen.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1605170439002-90845e8c0137?w=800', position: 0, alt: 'Spigen Case' },
        ],
      },
      averageRating: 4.7,
      reviewCount: 512,
    },
    {
      name: 'Anker MagGo Power Bank (10K)',
      slug: 'anker-maggo-power-bank-10k',
      sku: 'ANK-MAG-10K-WHT',
      description:
        'Qi2-certified 15W ultra-fast wireless charging. With a 10,000mAh capacity, it secures perfectly to your MagSafe-compatible iPhone for a full recharge on the go.',
      shortDescription: 'Qi2 15W wireless, 10000mAh capacity, MagSafe compatible.',
      price: new Prisma.Decimal(6490),
      compareAtPrice: new Prisma.Decimal(7990),
      stock: 85,
      isFeatured: true,
      category: { connect: { id: power.id } },
      brand: { connect: { id: anker.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1615526653198-d102e7df88e5?w=800', position: 0, alt: 'Anker Power Bank' },
        ],
      },
      averageRating: 4.9,
      reviewCount: 420,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log(`  ✓ products (${products.length})`);
  console.log('\n✨ Seed complete.\n');
  const adminPw = process.env.SEED_ADMIN_PASSWORD || 'Admin@drikon2026';
  console.log(`Login as admin: admin@drikon.com / ${adminPw}`);
  console.log('Login as demo:  demo@drikon.com  / User@drikon2026\n');
  console.log('⚠️  These are DEMO credentials. Rotate the admin password before exposing this publicly.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
