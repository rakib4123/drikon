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
  console.log('🌱 Seeding Drikon database...');

  // ─── Users ───
  const adminHash = await argon2.hash('Admin@drikon2026', argonOpts);
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
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, audio, accessories' },
  });
  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { name: 'Fashion', slug: 'fashion', description: 'Clothing & accessories' },
  });
  const home = await prisma.category.upsert({
    where: { slug: 'home-living' },
    update: {},
    create: { name: 'Home & Living', slug: 'home-living', description: 'Furniture, decor, kitchen' },
  });

  console.log('  ✓ categories');

  // ─── Brands ───
  const aurelis = await prisma.brand.upsert({
    where: { slug: 'aurelis' },
    update: {},
    create: { name: 'Aurelis', slug: 'aurelis' },
  });
  const nordval = await prisma.brand.upsert({
    where: { slug: 'nordval' },
    update: {},
    create: { name: 'Nordval', slug: 'nordval' },
  });

  console.log('  ✓ brands');

  // ─── Products ───
  const products: Array<Prisma.ProductCreateInput> = [
    {
      name: 'Aurelis Aether Pro Headphones',
      slug: 'aurelis-aether-pro-headphones',
      sku: 'AUR-AETH-PRO-001',
      description:
        'Reference-grade over-ear headphones with adaptive ANC, 40-hour battery, and hi-res certified drivers. Travel-grade comfort meets studio-grade sound.',
      shortDescription: 'Reference-grade ANC over-ears, 40h battery.',
      price: new Prisma.Decimal(28990),
      compareAtPrice: new Prisma.Decimal(34990),
      stock: 42,
      isFeatured: true,
      category: { connect: { id: electronics.id } },
      brand: { connect: { id: aurelis.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', position: 0, alt: 'Aurelis Aether Pro' },
        ],
      },
      attributes: { color: ['midnight', 'silver'], driverSize: '40mm', batteryHours: 40 },
      averageRating: 4.7,
      reviewCount: 128,
    },
    {
      name: 'Nordval Linen Overshirt',
      slug: 'nordval-linen-overshirt',
      sku: 'NRD-LIN-OVR-002',
      description:
        'Lightweight 100% Belgian linen overshirt. Cut for a relaxed, lived-in fit. Garment-washed for instant softness.',
      shortDescription: 'Relaxed linen overshirt, garment-washed.',
      price: new Prisma.Decimal(4990),
      stock: 80,
      isFeatured: true,
      category: { connect: { id: fashion.id } },
      brand: { connect: { id: nordval.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800', position: 0, alt: 'Nordval linen overshirt' },
        ],
      },
      attributes: { size: ['S', 'M', 'L', 'XL'], material: 'linen', care: 'cold wash' },
      averageRating: 4.4,
      reviewCount: 42,
    },
    {
      name: 'Aurelis Lumen Desk Lamp',
      slug: 'aurelis-lumen-desk-lamp',
      sku: 'AUR-LUM-DSK-003',
      description:
        'Tunable-white LED desk lamp with built-in wireless charger. Adjustable color temp from warm 2700K to focused 6500K.',
      shortDescription: 'Tunable-white LED lamp + wireless charger.',
      price: new Prisma.Decimal(7490),
      stock: 26,
      isFeatured: false,
      category: { connect: { id: home.id } },
      brand: { connect: { id: aurelis.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', position: 0, alt: 'Aurelis Lumen Desk Lamp' },
        ],
      },
      averageRating: 4.6,
      reviewCount: 19,
    },
    {
      name: 'Drikon Voyager Backpack 28L',
      slug: 'drikon-voyager-backpack-28l',
      sku: 'DRK-VYG-BP-004',
      description:
        'Carry-on legal 28L backpack with weatherproof ripstop shell, magnetic quick-access laptop sleeve, and a hidden RFID pocket.',
      shortDescription: 'Carry-on 28L pack, weatherproof, RFID pocket.',
      price: new Prisma.Decimal(8990),
      compareAtPrice: new Prisma.Decimal(11990),
      stock: 150,
      isFeatured: true,
      category: { connect: { id: fashion.id } },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', position: 0, alt: 'Voyager Backpack' },
        ],
      },
      averageRating: 4.8,
      reviewCount: 312,
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
  console.log('Login as admin: admin@drikon.com / Admin@drikon2026');
  console.log('Login as demo:  demo@drikon.com  / User@drikon2026\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
