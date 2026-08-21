/**
 * Drikon — seed data
 * Run: pnpm db:seed
 *
 * Creates: admin user, a customer, categories, brands, sample products.
 * All passwords are hashed with the same argon2id parameters as production.
 */
import { PrismaClient, Role, Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
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
  const audio = await prisma.category.upsert({
    where: { slug: 'audio' },
    update: {},
    create: { name: 'Audio', slug: 'audio', description: 'Headphones, earbuds, speakers' },
  });
  const wearables = await prisma.category.upsert({
    where: { slug: 'wearables' },
    update: {},
    create: { name: 'Wearables', slug: 'wearables', description: 'Smartwatches and fitness bands' },
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
  const google = await prisma.brand.upsert({
    where: { slug: 'google' },
    update: {},
    create: { name: 'Google', slug: 'google' },
  });
  const xiaomi = await prisma.brand.upsert({
    where: { slug: 'xiaomi' },
    update: {},
    create: { name: 'Xiaomi', slug: 'xiaomi' },
  });
  const jbl = await prisma.brand.upsert({
    where: { slug: 'jbl' },
    update: {},
    create: { name: 'JBL', slug: 'jbl' },
  });
  const sony = await prisma.brand.upsert({
    where: { slug: 'sony' },
    update: {},
    create: { name: 'Sony', slug: 'sony' },
  });

  console.log('  ✓ brands');

  // ─── Products ───
  // reviewTarget: how many real Review rows to generate for this product below.
  // averageRating/reviewCount are NOT set here — they're computed from the
  // actual seeded reviews after the fact, so the two never drift apart.
  const products: Array<{ data: Prisma.ProductCreateInput; reviewTarget: number }> = [
    {
      reviewTarget: 9,
      data: {
        name: 'iPhone 15 Pro Titanium',
        slug: 'iphone-15-pro-titanium',
        sku: 'APL-IP15P-256-NT',
        description:
          'Forged in aerospace-grade titanium. Features the A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.',
        shortDescription: 'Aerospace-grade titanium, A17 Pro chip, Pro camera system.',
        nameBn: 'আইফোন ১৫ প্রো টাইটানিয়াম',
        shortDescriptionBn: 'অ্যারোস্পেস-গ্রেড টাইটানিয়াম, A17 Pro চিপ, প্রো ক্যামেরা সিস্টেম।',
        descriptionBn:
          'অ্যারোস্পেস-গ্রেড টাইটানিয়ামে তৈরি। রয়েছে A17 Pro চিপ, কাস্টমাইজযোগ্য অ্যাকশন বাটন, এবং আইফোনের সবচেয়ে শক্তিশালী ক্যামেরা সিস্টেম।',
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
      },
    },
    {
      reviewTarget: 8,
      data: {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        sku: 'SAM-S24U-512-TI',
        description:
          'Welcome to the era of mobile AI. The Galaxy S24 Ultra unleashes new levels of creativity, productivity, and possibility, starting with the most important device in your life.',
        shortDescription: 'Titanium exterior, Galaxy AI, 200MP camera, built-in S Pen.',
        nameBn: 'স্যামসাং গ্যালাক্সি S24 আল্ট্রা',
        shortDescriptionBn: 'টাইটানিয়াম বডি, Galaxy AI, ২০০MP ক্যামেরা, বিল্ট-ইন S Pen।',
        descriptionBn:
          'মোবাইল AI-এর যুগে স্বাগতম। Galaxy S24 আল্ট্রা আপনার জীবনের সবচেয়ে গুরুত্বপূর্ণ ডিভাইস থেকে শুরু করে সৃজনশীলতা, উৎপাদনশীলতা এবং সম্ভাবনার নতুন মাত্রা উন্মোচন করে।',
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
      },
    },
    {
      reviewTarget: 6,
      data: {
        name: 'Spigen Core Armor Case',
        slug: 'spigen-core-armor-iphone-15-pro',
        sku: 'SPG-CA-IP15P-MB',
        description:
          'Suit up. The Core Armor provides absolute protection with its signature shock-absorbing design and tactile grip. Keeps your device pristine in every drop.',
        shortDescription: 'Slim shock-absorbing protection, matte black finish.',
        nameBn: 'স্পিজেন কোর আর্মার কেস',
        shortDescriptionBn: 'স্লিম শক-অ্যাবজর্বিং প্রোটেকশন, ম্যাট ব্ল্যাক ফিনিশ।',
        descriptionBn:
          'প্রস্তুত হোন। কোর আর্মার এর সিগনেচার শক-অ্যাবজর্বিং ডিজাইন ও টাচাইল গ্রিপ দিয়ে সম্পূর্ণ সুরক্ষা দেয়। প্রতিটি পড়ে যাওয়াতেও আপনার ডিভাইস রাখে অক্ষত।',
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
      },
    },
    {
      reviewTarget: 7,
      data: {
        name: 'Anker MagGo Power Bank (10K)',
        slug: 'anker-maggo-power-bank-10k',
        sku: 'ANK-MAG-10K-WHT',
        description:
          'Qi2-certified 15W ultra-fast wireless charging. With a 10,000mAh capacity, it secures perfectly to your MagSafe-compatible iPhone for a full recharge on the go.',
        shortDescription: 'Qi2 15W wireless, 10000mAh capacity, MagSafe compatible.',
        nameBn: 'অ্যাংকার ম্যাগগো পাওয়ার ব্যাংক (১০K)',
        shortDescriptionBn: 'Qi2 15W ওয়্যারলেস, ১০০০০mAh ক্যাপাসিটি, ম্যাগসেফ কম্প্যাটিবল।',
        descriptionBn:
          'Qi2-সার্টিফায়েড 15W আল্ট্রা-ফাস্ট ওয়্যারলেস চার্জিং। ১০,০০০mAh ক্যাপাসিটি নিয়ে এটি আপনার ম্যাগসেফ-কম্প্যাটিবল আইফোনের সাথে নিখুঁতভাবে আটকে পূর্ণ রিচার্জ দেয়, যেখানেই থাকুন।',
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
      },
    },
    // ─ Smartphones (new) ─
    {
      reviewTarget: 6,
      data: {
        name: 'Google Pixel 8 Pro',
        slug: 'google-pixel-8-pro',
        sku: 'GGL-P8P-256-OBS',
        description:
          'The most helpful Pixel yet. With Google AI built in, a Pro-level camera system, and a stunning Super Actua display, Pixel 8 Pro helps you get more done.',
        shortDescription: 'Google AI built in, Pro camera system, Super Actua display.',
        nameBn: 'গুগল পিক্সেল ৮ প্রো',
        shortDescriptionBn: 'বিল্ট-ইন Google AI, প্রো ক্যামেরা সিস্টেম, Super Actua ডিসপ্লে।',
        descriptionBn:
          'সবচেয়ে সহায়ক পিক্সেল এখন পর্যন্ত। বিল্ট-ইন Google AI, প্রো-লেভেল ক্যামেরা সিস্টেম এবং অসাধারণ Super Actua ডিসপ্লে নিয়ে, Pixel 8 Pro আপনাকে আরও বেশি কাজ সম্পন্ন করতে সাহায্য করে।',
        price: new Prisma.Decimal(114990),
        stock: 28,
        isFeatured: false,
        category: { connect: { id: smartphones.id } },
        brand: { connect: { id: google.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1706412703794-d944cd3625b3?w=800', position: 0, alt: 'Google Pixel 8 Pro smartphone with visible camera bar and G logo' }] },
        attributes: { storage: ['128GB', '256GB', '512GB'], color: ['Obsidian', 'Porcelain', 'Bay'] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'Xiaomi 14 Ultra',
        slug: 'xiaomi-14-ultra',
        sku: 'XMI-14U-512-BLK',
        description:
          'Co-engineered with Leica. A quad-camera system built for professional photography, wrapped in a design that feels as premium as it performs.',
        shortDescription: 'Leica co-engineered quad camera, flagship performance.',
        nameBn: 'শাওমি ১৪ আল্ট্রা',
        shortDescriptionBn: 'Leica-এর সাথে কো-ইঞ্জিনিয়ার্ড কোয়াড ক্যামেরা, ফ্ল্যাগশিপ পারফরম্যান্স।',
        descriptionBn:
          'Leica-এর সাথে যৌথভাবে ইঞ্জিনিয়ার্ড। পেশাদার ফটোগ্রাফির জন্য তৈরি একটি কোয়াড-ক্যামেরা সিস্টেম, যা যতটা প্রিমিয়াম দেখায় ততটাই পারফর্ম করে।',
        price: new Prisma.Decimal(124990),
        stock: 22,
        isFeatured: false,
        category: { connect: { id: smartphones.id } },
        brand: { connect: { id: xiaomi.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1655802334467-5591938e0c62?w=800', position: 0, alt: 'Xiaomi 14 Ultra premium smartphone with prominent circular camera module' }] },
        attributes: { storage: ['256GB', '512GB'], color: ['Black'] },
      },
    },
    {
      reviewTarget: 4,
      data: {
        name: 'Samsung Galaxy A55',
        slug: 'samsung-galaxy-a55',
        sku: 'SAM-A55-128-LIL',
        description:
          'Awesome is for everyone. The Galaxy A55 brings a sleek metal frame, a bright display, and a versatile camera to the mid-range lineup.',
        shortDescription: 'Metal frame, bright display, versatile everyday camera.',
        nameBn: 'স্যামসাং গ্যালাক্সি A55',
        shortDescriptionBn: 'মেটাল ফ্রেম, উজ্জ্বল ডিসপ্লে, বহুমুখী প্রতিদিনের ক্যামেরা।',
        descriptionBn:
          'সবার জন্য অসাধারণ। Galaxy A55 মিড-রেঞ্জ লাইনআপে নিয়ে আসে একটি স্লিক মেটাল ফ্রেম, উজ্জ্বল ডিসপ্লে এবং বহুমুখী ক্যামেরা।',
        price: new Prisma.Decimal(42990),
        stock: 60,
        isFeatured: false,
        category: { connect: { id: smartphones.id } },
        brand: { connect: { id: samsung.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1565967249821-083c4775e5bc?w=800', position: 0, alt: 'Samsung Galaxy A55 smartphone, silver finish' }] },
        attributes: { storage: ['128GB', '256GB'], color: ['Awesome Lilac', 'Awesome Navy'] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'iPhone SE',
        slug: 'iphone-se',
        sku: 'APL-SE-128-MID',
        description:
          'The most affordable way into iPhone. Compact, powerful, and ready for anything with a chip that keeps it fast for years to come.',
        shortDescription: 'Compact design, powerful chip, affordable entry to iPhone.',
        nameBn: 'আইফোন SE',
        shortDescriptionBn: 'কমপ্যাক্ট ডিজাইন, শক্তিশালী চিপ, আইফোনে সাশ্রয়ী প্রবেশ।',
        descriptionBn:
          'আইফোনে প্রবেশের সবচেয়ে সাশ্রয়ী উপায়। কমপ্যাক্ট, শক্তিশালী, এবং এমন একটি চিপ নিয়ে প্রস্তুত যা বছরের পর বছর ধরে এটিকে দ্রুত রাখে।',
        price: new Prisma.Decimal(49990),
        stock: 45,
        isFeatured: false,
        category: { connect: { id: smartphones.id } },
        brand: { connect: { id: apple.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1634403665481-74948d815f03?w=800', position: 0, alt: 'iPhone SE compact smartphone with blank display' }] },
        attributes: { storage: ['64GB', '128GB', '256GB'], color: ['Midnight', 'Starlight', 'Red'] },
      },
    },
    // ─ Cases & Protection (new) ─
    {
      reviewTarget: 6,
      data: {
        name: 'Spigen Tempered Glass Screen Protector',
        slug: 'spigen-tempered-glass-screen-protector',
        sku: 'SPG-TG-UNI-2PK',
        description:
          '9H hardness tempered glass with an easy-install tray for a perfectly centered, bubble-free application every time. Case-friendly edges.',
        shortDescription: '9H hardness, bubble-free install tray, case-friendly fit.',
        nameBn: 'স্পিজেন টেম্পারড গ্লাস স্ক্রিন প্রোটেক্টর',
        shortDescriptionBn: '9H হার্ডনেস, বাবল-ফ্রি ইনস্টল ট্রে, কেস-ফ্রেন্ডলি ফিট।',
        descriptionBn:
          '9H হার্ডনেসের টেম্পারড গ্লাস, সাথে একটি সহজ-ইনস্টল ট্রে যা প্রতিবার নিখুঁতভাবে কেন্দ্রীভূত, বাবল-ফ্রি প্রয়োগ নিশ্চিত করে। কেস-ফ্রেন্ডলি প্রান্ত।',
        price: new Prisma.Decimal(990),
        stock: 200,
        isFeatured: false,
        category: { connect: { id: cases.id } },
        brand: { connect: { id: spigen.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1726900303636-fb7447fce40d?w=800', position: 0, alt: 'Smartphone with glossy protected screen, close-up product shot' }] },
      },
    },
    {
      reviewTarget: 4,
      data: {
        name: 'Anker MagSafe Wallet Case',
        slug: 'anker-magsafe-wallet-case',
        sku: 'ANK-MSW-IP15-BLK',
        description:
          'A slim case with a built-in MagSafe-compatible card holder that snaps on and off securely. Carry your cards without carrying a separate wallet.',
        shortDescription: 'Built-in MagSafe card holder, slim protective shell.',
        nameBn: 'অ্যাংকার ম্যাগসেফ ওয়ালেট কেস',
        shortDescriptionBn: 'বিল্ট-ইন ম্যাগসেফ কার্ড হোল্ডার, স্লিম প্রোটেক্টিভ শেল।',
        descriptionBn:
          'একটি স্লিম কেস যাতে বিল্ট-ইন ম্যাগসেফ-কম্প্যাটিবল কার্ড হোল্ডার রয়েছে, যা নিরাপদে আটকে যায় ও খোলা যায়। আলাদা ওয়ালেট ছাড়াই আপনার কার্ড বহন করুন।',
        price: new Prisma.Decimal(3290),
        stock: 70,
        isFeatured: false,
        category: { connect: { id: cases.id } },
        brand: { connect: { id: anker.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1688378707062-9a56a951d28d?w=800', position: 0, alt: 'Phone case with attached MagSafe card wallet holder' }] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'Spigen Slim Armor Case',
        slug: 'spigen-slim-armor-case',
        sku: 'SPG-SA-GS24U-GY',
        description:
          'Dual-layer protection with a kickstand built in. Slim enough for everyday carry, tough enough for the days things don’t go as planned.',
        shortDescription: 'Dual-layer protection with a built-in kickstand.',
        nameBn: 'স্পিজেন স্লিম আর্মার কেস',
        shortDescriptionBn: 'বিল্ট-ইন কিকস্ট্যান্ডসহ ডুয়াল-লেয়ার প্রোটেকশন।',
        descriptionBn:
          'বিল্ট-ইন কিকস্ট্যান্ডসহ ডুয়াল-লেয়ার প্রোটেকশন। প্রতিদিনের বহনের জন্য যথেষ্ট স্লিম, আবার পরিস্থিতি প্রতিকূল হলেও যথেষ্ট টেকসই।',
        price: new Prisma.Decimal(2790),
        stock: 90,
        isFeatured: false,
        category: { connect: { id: cases.id } },
        brand: { connect: { id: spigen.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1625465329894-9cfaf8a63332?w=800', position: 0, alt: 'Rugged black and gray phone case with textured grip' }] },
      },
    },
    {
      reviewTarget: 3,
      data: {
        name: 'Clear Silicone Case',
        slug: 'clear-silicone-case',
        sku: 'GEN-CLR-UNI-TRN',
        description:
          'Show off your phone’s original design with a soft-touch clear case that resists yellowing and adds just enough grip and drop protection.',
        shortDescription: 'Yellow-resistant clear silicone, soft-touch grip.',
        nameBn: 'ক্লিয়ার সিলিকন কেস',
        shortDescriptionBn: 'হলুদ-প্রতিরোধী ক্লিয়ার সিলিকন, সফট-টাচ গ্রিপ।',
        descriptionBn:
          'একটি সফট-টাচ ক্লিয়ার কেস দিয়ে আপনার ফোনের আসল ডিজাইন প্রদর্শন করুন, যা হলুদ হওয়া প্রতিরোধ করে এবং পর্যাপ্ত গ্রিপ ও ড্রপ প্রোটেকশন যোগ করে।',
        price: new Prisma.Decimal(1290),
        stock: 150,
        isFeatured: false,
        category: { connect: { id: cases.id } },
        brand: { connect: { id: spigen.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1771142061210-95e97225641e?w=800', position: 0, alt: 'Clear transparent phone case with magnetic charging ring' }] },
      },
    },
    // ─ Chargers & Power (new) ─
    {
      reviewTarget: 7,
      data: {
        name: 'Anker 65W GaN Charger',
        slug: 'anker-65w-gan-charger',
        sku: 'ANK-GAN65-BLK',
        description:
          'Charge a laptop and two phones at once from a charger smaller than your palm. GaN II technology packs 65W into a compact, cool-running shell.',
        shortDescription: 'Compact 65W GaN charger, 3 ports, laptop-capable.',
        nameBn: 'অ্যাংকার ৬৫W GaN চার্জার',
        shortDescriptionBn: 'কমপ্যাক্ট 65W GaN চার্জার, ৩টি পোর্ট, ল্যাপটপ-সক্ষম।',
        descriptionBn:
          'একটি ল্যাপটপ এবং দুটি ফোন একসাথে চার্জ করুন, এমন একটি চার্জার দিয়ে যা আপনার হাতের তালুর চেয়েও ছোট। GaN II প্রযুক্তি একটি কমপ্যাক্ট, ঠাণ্ডা-চলমান শেলে 65W প্যাক করে।',
        price: new Prisma.Decimal(3990),
        stock: 110,
        isFeatured: true,
        category: { connect: { id: power.id } },
        brand: { connect: { id: anker.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1763161786687-43d0c9babdf0?w=800', position: 0, alt: 'Compact black GaN wall charger with multiple ports' }] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'Anker MagGo Power Bank (20K)',
        slug: 'anker-maggo-power-bank-20k',
        sku: 'ANK-MAG-20K-WHT',
        description:
          'Double the capacity of the 10K for road trips and long days out. Qi2-certified 15W wireless charging, plus a USB-C port for wired top-ups.',
        shortDescription: 'Qi2 15W wireless, 20000mAh capacity, USB-C port.',
        nameBn: 'অ্যাংকার ম্যাগগো পাওয়ার ব্যাংক (২০K)',
        shortDescriptionBn: 'Qi2 15W ওয়্যারলেস, ২০০০০mAh ক্যাপাসিটি, USB-C পোর্ট।',
        descriptionBn:
          'রোড ট্রিপ ও দীর্ঘ দিনের জন্য 10K-এর দ্বিগুণ ক্যাপাসিটি। Qi2-সার্টিফায়েড 15W ওয়্যারলেস চার্জিং, সাথে ওয়্যার্ড টপ-আপের জন্য একটি USB-C পোর্ট।',
        price: new Prisma.Decimal(9990),
        compareAtPrice: new Prisma.Decimal(11990),
        stock: 55,
        isFeatured: false,
        category: { connect: { id: power.id } },
        brand: { connect: { id: anker.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?w=800', position: 0, alt: 'Portable power bank charging a smartphone' }] },
      },
    },
    {
      reviewTarget: 4,
      data: {
        name: 'Anker USB-C Cable (3-Pack)',
        slug: 'anker-usb-c-cable-3-pack',
        sku: 'ANK-CBL-C2C-3PK',
        description:
          'Braided nylon USB-C to USB-C cables rated for 100W and 10,000+ bend life. One for the desk, one for the bag, one for the car.',
        shortDescription: 'Braided nylon, 100W rated, 3 cables per pack.',
        nameBn: 'অ্যাংকার USB-C কেবল (৩-প্যাক)',
        shortDescriptionBn: 'ব্রেইডেড নাইলন, 100W রেটেড, প্যাকে ৩টি কেবল।',
        descriptionBn:
          'ব্রেইডেড নাইলন USB-C থেকে USB-C কেবল, 100W এবং ১০,০০০+ বাঁক-সহনশীলতার জন্য রেট করা। একটি ডেস্কের জন্য, একটি ব্যাগের জন্য, একটি গাড়ির জন্য।',
        price: new Prisma.Decimal(1690),
        stock: 130,
        isFeatured: false,
        category: { connect: { id: power.id } },
        brand: { connect: { id: anker.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1595756630452-736bc8ef3693?w=800', position: 0, alt: 'Black USB-C charging cable with braided sleeve' }] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'Apple 20W USB-C Power Adapter',
        slug: 'apple-20w-usb-c-power-adapter',
        sku: 'APL-PWR-20W-WHT',
        description:
          'A compact, efficient power adapter that fast-charges your iPhone and works great with any USB-C device. No cable included.',
        shortDescription: 'Compact 20W USB-C fast-charging power adapter.',
        nameBn: 'অ্যাপল ২০W USB-C পাওয়ার অ্যাডাপ্টার',
        shortDescriptionBn: 'কমপ্যাক্ট 20W USB-C ফাস্ট-চার্জিং পাওয়ার অ্যাডাপ্টার।',
        descriptionBn:
          'একটি কমপ্যাক্ট, কার্যকর পাওয়ার অ্যাডাপ্টার যা আপনার আইফোন দ্রুত চার্জ করে এবং যেকোনো USB-C ডিভাইসের সাথে দারুণভাবে কাজ করে। কেবল অন্তর্ভুক্ত নয়।',
        price: new Prisma.Decimal(2490),
        stock: 95,
        isFeatured: false,
        category: { connect: { id: power.id } },
        brand: { connect: { id: apple.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1517320069935-381614f8c1e5?w=800', position: 0, alt: 'Small white USB-C power adapter cube' }] },
      },
    },
    // ─ Audio (new category) ─
    {
      reviewTarget: 6,
      data: {
        name: 'JBL Tune 510BT',
        slug: 'jbl-tune-510bt',
        sku: 'JBL-T510BT-BLK',
        description:
          'Pure JBL sound wireless. Up to 40 hours of battery life on a single charge means the music keeps going long after everything else stops.',
        shortDescription: 'Wireless over-ear, 40-hour battery, JBL Pure Bass sound.',
        nameBn: 'জেবিএল টিউন ৫১০BT',
        shortDescriptionBn: 'ওয়্যারলেস ওভার-ইয়ার, ৪০-ঘণ্টা ব্যাটারি, JBL Pure Bass সাউন্ড।',
        descriptionBn:
          'বিশুদ্ধ JBL সাউন্ড, ওয়্যারলেসে। একবার চার্জে ৪০ ঘণ্টা পর্যন্ত ব্যাটারি লাইফ মানে বাকি সবকিছু থেমে যাওয়ার অনেক পরেও গান চলতে থাকে।',
        price: new Prisma.Decimal(3990),
        stock: 75,
        isFeatured: false,
        category: { connect: { id: audio.id } },
        brand: { connect: { id: jbl.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1622473776277-c57c423daf63?w=800', position: 0, alt: 'JBL over-ear wireless headphones, close-up on branded ear cup' }] },
      },
    },
    {
      reviewTarget: 9,
      data: {
        name: 'Sony WH-1000XM5',
        slug: 'sony-wh-1000xm5',
        sku: 'SNY-WH1000XM5-BLK',
        description:
          'Industry-leading noise cancellation meets exceptional sound quality. Two processors and eight microphones work together to filter out the world.',
        shortDescription: 'Industry-leading ANC, all-day comfort, premium sound.',
        nameBn: 'সনি WH-1000XM5',
        shortDescriptionBn: 'ইন্ডাস্ট্রি-লিডিং ANC, সারাদিনের আরাম, প্রিমিয়াম সাউন্ড।',
        descriptionBn:
          'ইন্ডাস্ট্রি-লিডিং নয়েজ ক্যান্সেলেশন এবং অসাধারণ সাউন্ড কোয়ালিটির মিশ্রণ। দুটি প্রসেসর ও আটটি মাইক্রোফোন একসাথে কাজ করে বাইরের জগৎ থেকে আপনাকে আলাদা করে।',
        price: new Prisma.Decimal(34990),
        compareAtPrice: new Prisma.Decimal(39990),
        stock: 40,
        isFeatured: true,
        category: { connect: { id: audio.id } },
        brand: { connect: { id: sony.id } },
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1621208587196-0b2a7d2aeb03?w=800', position: 0, alt: 'Sony WH-1000XM5 premium noise-cancelling over-ear headphones' },
            { url: 'https://images.unsplash.com/photo-1642622039751-f74f2d1a0280?w=800', position: 1, alt: 'Sony over-ear headphones resting on a wooden table, alternate angle' },
          ],
        },
      },
    },
    {
      reviewTarget: 8,
      data: {
        name: 'Apple AirPods Pro (2nd gen)',
        slug: 'apple-airpods-pro-2',
        sku: 'APL-APP2-USBC',
        description:
          'Adaptive Audio, richer sound, and up to 2x more Active Noise Cancellation. Personalized to your ear for a seal that’s comfortable and secure.',
        shortDescription: 'Adaptive Audio, 2x ANC, personalized fit.',
        nameBn: 'অ্যাপল এয়ারপডস প্রো (২য় প্রজন্ম)',
        shortDescriptionBn: 'Adaptive Audio, 2x ANC, ব্যক্তিগতকৃত ফিট।',
        descriptionBn:
          'Adaptive Audio, সমৃদ্ধ সাউন্ড, এবং ২ গুণ বেশি Active Noise Cancellation। আপনার কানের জন্য ব্যক্তিগতকৃত, আরামদায়ক ও নিরাপদ ফিটের জন্য।',
        price: new Prisma.Decimal(29990),
        stock: 50,
        isFeatured: true,
        category: { connect: { id: audio.id } },
        brand: { connect: { id: apple.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1505236273191-1dce886b01e9?w=800', position: 0, alt: 'Apple AirPods Pro white wireless earbuds in charging case' }] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'JBL Flip 6 Speaker',
        slug: 'jbl-flip-6-speaker',
        sku: 'JBL-FLIP6-BLU',
        description:
          'Bold JBL Original Pro Sound in a rugged, IP67 waterproof and dustproof body. Toss it in a bag, take it anywhere, turn it up.',
        shortDescription: 'IP67 waterproof, bold sound, portable design.',
        nameBn: 'জেবিএল ফ্লিপ ৬ স্পিকার',
        shortDescriptionBn: 'IP67 ওয়াটারপ্রুফ, বোল্ড সাউন্ড, পোর্টেবল ডিজাইন।',
        descriptionBn:
          'একটি রাগেড, IP67 ওয়াটারপ্রুফ ও ডাস্টপ্রুফ বডিতে বোল্ড JBL Original Pro Sound। ব্যাগে ভরুন, যেকোনো জায়গায় নিয়ে যান, ভলিউম বাড়িয়ে দিন।',
        price: new Prisma.Decimal(11990),
        stock: 45,
        isFeatured: false,
        category: { connect: { id: audio.id } },
        brand: { connect: { id: jbl.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1588131153911-a4ea5189fe19?w=800', position: 0, alt: 'JBL Flip portable cylindrical bluetooth speaker with carabiner' }] },
      },
    },
    {
      reviewTarget: 4,
      data: {
        name: 'Sony WF-C700N Earbuds',
        slug: 'sony-wf-c700n-earbuds',
        sku: 'SNY-WFC700N-BLK',
        description:
          'Compact noise-cancelling earbuds that don’t compromise on sound. Lightweight comfort for all-day listening, indoors or out.',
        shortDescription: 'Compact ANC earbuds, lightweight, all-day comfort.',
        nameBn: 'সনি WF-C700N ইয়ারবাডস',
        shortDescriptionBn: 'কমপ্যাক্ট ANC ইয়ারবাডস, হালকা, সারাদিনের আরাম।',
        descriptionBn:
          'কমপ্যাক্ট নয়েজ-ক্যান্সেলিং ইয়ারবাডস যা সাউন্ডে কোনো আপস করে না। সারাদিন শোনার জন্য হালকা আরাম, ঘরে বা বাইরে।',
        price: new Prisma.Decimal(8990),
        stock: 65,
        isFeatured: false,
        category: { connect: { id: audio.id } },
        brand: { connect: { id: sony.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800', position: 0, alt: 'Small black wireless earbuds with charging case' }] },
      },
    },
    // ─ Wearables (new category) ─
    {
      reviewTarget: 7,
      data: {
        name: 'Apple Watch Series 9',
        slug: 'apple-watch-series-9',
        sku: 'APL-AWS9-45-MID',
        description:
          'A magical new way to use your Apple Watch without touching the screen, a brighter display, and our most powerful chip yet.',
        shortDescription: 'Double Tap gesture, brighter display, S9 chip.',
        nameBn: 'অ্যাপল ওয়াচ সিরিজ ৯',
        shortDescriptionBn: 'Double Tap জেসচার, উজ্জ্বল ডিসপ্লে, S9 চিপ।',
        descriptionBn:
          'স্ক্রিন স্পর্শ না করেই আপনার অ্যাপল ওয়াচ ব্যবহারের এক জাদুকরী নতুন উপায়, একটি উজ্জ্বল ডিসপ্লে, এবং এখন পর্যন্ত আমাদের সবচেয়ে শক্তিশালী চিপ।',
        price: new Prisma.Decimal(44990),
        stock: 38,
        isFeatured: true,
        category: { connect: { id: wearables.id } },
        brand: { connect: { id: apple.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1637160151663-a410315e4e75?w=800', position: 0, alt: 'Apple Watch Series 9 smartwatch displaying the time, black band' }] },
        attributes: { size: ['41mm', '45mm'], color: ['Midnight', 'Starlight', 'Pink'] },
      },
    },
    {
      reviewTarget: 5,
      data: {
        name: 'Samsung Galaxy Watch 6',
        slug: 'samsung-galaxy-watch-6',
        sku: 'SAM-GW6-44-GPH',
        description:
          'A sleeker design with a bigger screen and a rotating bezel-inspired touch experience. Detailed sleep coaching helps you rest better.',
        shortDescription: 'Bigger screen, sleep coaching, comfortable all-day fit.',
        nameBn: 'স্যামসাং গ্যালাক্সি ওয়াচ ৬',
        shortDescriptionBn: 'বড় স্ক্রিন, স্লিপ কোচিং, আরামদায়ক সারাদিনের ফিট।',
        descriptionBn:
          'বড় স্ক্রিন এবং রোটেটিং বেজেল-অনুপ্রাণিত টাচ অভিজ্ঞতাসহ আরও স্লিক ডিজাইন। বিস্তারিত স্লিপ কোচিং আপনাকে ভালো ঘুমাতে সাহায্য করে।',
        price: new Prisma.Decimal(32990),
        stock: 42,
        isFeatured: false,
        category: { connect: { id: wearables.id } },
        brand: { connect: { id: samsung.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1722152845711-be94a0751c8c?w=800', position: 0, alt: 'Samsung Galaxy Watch 6, circular face, worn on wrist' }] },
        attributes: { size: ['40mm', '44mm'], color: ['Graphite', 'Silver'] },
      },
    },
    {
      reviewTarget: 6,
      data: {
        name: 'Xiaomi Smart Band 8',
        slug: 'xiaomi-smart-band-8',
        sku: 'XMI-SB8-BLK',
        description:
          'A slim, lightweight tracker with a vivid AMOLED display, 150+ workout modes, and up to 16 days of battery life on a single charge.',
        shortDescription: 'AMOLED display, 150+ workout modes, 16-day battery.',
        nameBn: 'শাওমি স্মার্ট ব্যান্ড ৮',
        shortDescriptionBn: 'AMOLED ডিসপ্লে, ১৫০+ ওয়ার্কআউট মোড, ১৬-দিনের ব্যাটারি।',
        descriptionBn:
          'একটি স্লিম, হালকা ট্র্যাকার যাতে রয়েছে উজ্জ্বল AMOLED ডিসপ্লে, ১৫০+ ওয়ার্কআউট মোড, এবং একবার চার্জে ১৬ দিন পর্যন্ত ব্যাটারি লাইফ।',
        price: new Prisma.Decimal(4490),
        stock: 100,
        isFeatured: false,
        category: { connect: { id: wearables.id } },
        brand: { connect: { id: xiaomi.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800', position: 0, alt: 'Xiaomi Smart Band fitness tracker with colorful display' }] },
      },
    },
    {
      reviewTarget: 4,
      data: {
        name: 'Google Pixel Watch 2',
        slug: 'google-pixel-watch-2',
        sku: 'GGL-PW2-41-OBS',
        description:
          'Helpful insights, all day battery, and Fitbit’s most advanced health features yet, wrapped in a beautifully domed design.',
        shortDescription: 'Fitbit health features, all-day battery, domed design.',
        nameBn: 'গুগল পিক্সেল ওয়াচ ২',
        shortDescriptionBn: 'Fitbit স্বাস্থ্য ফিচার, সারাদিনের ব্যাটারি, ডোমড ডিজাইন।',
        descriptionBn:
          'সহায়ক ইনসাইট, সারাদিনের ব্যাটারি, এবং Fitbit-এর এখন পর্যন্ত সবচেয়ে উন্নত স্বাস্থ্য ফিচার, একটি সুন্দর ডোমড ডিজাইনে মোড়ানো।',
        price: new Prisma.Decimal(38990),
        stock: 30,
        isFeatured: false,
        category: { connect: { id: wearables.id } },
        brand: { connect: { id: google.id } },
        images: { create: [{ url: 'https://images.unsplash.com/photo-1683714152903-a17197c2347c?w=800', position: 0, alt: 'Round-faced smartwatch showing time and weather, Pixel Watch style' }] },
        attributes: { size: ['41mm'], color: ['Matte Black', 'Polished Silver'] },
      },
    },
  ];

  const productsBySlug = new Map<string, { id: string; reviewTarget: number }>();
  for (const p of products) {
    const rec = await prisma.product.upsert({
      where: { slug: p.data.slug! },
      update: {},
      create: p.data,
    });
    productsBySlug.set(p.data.slug!, { id: rec.id, reviewTarget: p.reviewTarget });
  }

  console.log(`  ✓ products (${products.length})`);

  // ─── Review authors ───
  // Distinct fake customer accounts so reviews look like real shoppers, not
  // one account posting everywhere. Cheap argon2 params here (not `demo`'s
  // login-quality hash) since these accounts are never meant to log in.
  const reviewerNames = [
    'Rafiq Ahmed',
    'Nusrat Jahan',
    'Tanvir Hasan',
    'Farhana Akter',
    'Imran Kabir',
    'Sadia Islam',
    'Mahin Chowdhury',
    'Priya Sharma',
    'Alex Morgan',
    'Michael Chen',
  ];
  const reviewerHash = await argon2.hash('not-a-real-login', { type: argon2.argon2id, memoryCost: 8192, timeCost: 2, parallelism: 1 });
  const reviewers = [];
  for (const [i, name] of reviewerNames.entries()) {
    const email = `reviewer${i + 1}@drikon-demo.example`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: reviewerHash, role: Role.USER, emailVerified: new Date() },
    });
    reviewers.push(user);
  }

  console.log(`  ✓ review authors (${reviewers.length})`);

  // ─── Reviews ───
  // A shared pool of realistic, product-agnostic review text. Each product
  // draws `reviewTarget` entries from it (rotating start offset per product
  // so no two products get an identical set), paired with a rotating
  // reviewer so (userId, productId) stays unique.
  const reviewPool: Array<{ rating: number; title: string; body: string }> = [
    { rating: 5, title: 'Exceeded expectations', body: 'Works perfectly and arrived faster than I expected. Build quality feels premium.' },
    { rating: 5, title: 'Worth every taka', body: 'Was hesitant about the price but this is genuinely excellent. No regrets.' },
    { rating: 5, title: 'Exactly as described', body: 'Matches the listing perfectly. Packaging was solid too.' },
    { rating: 5, title: 'My new daily driver', body: "Been using this for a few weeks now and it's become part of my routine." },
    { rating: 5, title: 'Great value', body: 'Does everything I need without any fuss. Highly recommend.' },
    { rating: 5, title: 'Impressed', body: "Didn't expect this level of quality at this price point." },
    { rating: 5, title: 'Five stars, easy', body: 'No complaints at all. Fast delivery, product works as advertised.' },
    { rating: 5, title: 'Solid purchase', body: 'Been reliable so far, no issues to report.' },
    { rating: 5, title: 'Better than expected', body: "The reviews convinced me and I'm glad I trusted them." },
    { rating: 5, title: 'Love it', body: 'Genuinely happy with this purchase, would buy again.' },
    { rating: 5, title: 'Exactly what I needed', body: 'Fit my use case perfectly, no surprises.' },
    { rating: 5, title: 'Reliable', body: 'Been using this daily without a single issue.' },
    { rating: 4, title: 'Very good, minor nitpick', body: 'Great overall, just wish the box included a better manual.' },
    { rating: 4, title: 'Almost perfect', body: 'Does the job well, only docking a star for the slightly slow delivery.' },
    { rating: 4, title: 'Good but not flawless', body: 'Works well day to day, a bit bulkier than I expected from photos.' },
    { rating: 4, title: 'Solid, a few small issues', body: 'Overall satisfied, had a minor hiccup on first setup that resolved itself.' },
    { rating: 4, title: 'Recommended with a caveat', body: 'Good product, just make sure you read the sizing/specs carefully first.' },
    { rating: 4, title: 'Happy customer', body: 'Works great, wish it came in more color options.' },
    { rating: 4, title: 'Does what it says', body: "No major complaints, does exactly what's promised." },
    { rating: 4, title: 'Good purchase', body: 'Solid quality, took a bit to get used to but works well now.' },
    { rating: 3, title: "It's okay", body: 'Does the basic job but nothing special. Expected a bit more for the price.' },
    { rating: 3, title: 'Mixed feelings', body: 'Some things work great, others feel like an afterthought.' },
    { rating: 3, title: 'Average', body: 'Not bad, not amazing. Gets the job done.' },
    { rating: 3, title: 'Decent, room to improve', body: "Functional but I've used better at similar price points before." },
  ];

  let reviewsCreated = 0;
  let offset = 0;
  for (const [slug, product] of productsBySlug) {
    for (let i = 0; i < product.reviewTarget; i++) {
      const entry = reviewPool[(offset + i) % reviewPool.length];
      const reviewer = reviewers[(offset + i) % reviewers.length];
      await prisma.review.upsert({
        where: { userId_productId: { userId: reviewer.id, productId: product.id } },
        update: {},
        create: {
          userId: reviewer.id,
          productId: product.id,
          rating: entry.rating,
          title: entry.title,
          body: entry.body,
          isVerified: true,
        },
      });
      reviewsCreated += 1;
    }
    offset += 3; // shift the pool window so consecutive products don't share an identical set
    void slug;
  }

  // Recompute averageRating/reviewCount from the real rows so the two never
  // drift apart (the site previously showed rating badges with no reviews
  // behind them — this keeps card badges and the PDP reviews section honest).
  for (const [, product] of productsBySlug) {
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }

  console.log(`  ✓ reviews (${reviewsCreated}), ratings recomputed from real rows`);

  // ─── Demo orders (for the Apriori-based recommendations feature) ───
  // Deliberate co-purchase patterns so Apriori has real signal to mine:
  //   iPhone + Case + Power bank bundle together often (strong 3-way rule),
  //   iPhone + Case pair even more often (case is iPhone-specific),
  //   Galaxy + Power bank pair independently, plus some solo purchases as noise.
  const iphone = await prisma.product.findUniqueOrThrow({ where: { slug: 'iphone-15-pro-titanium' } });
  const galaxy = await prisma.product.findUniqueOrThrow({ where: { slug: 'samsung-galaxy-s24-ultra' } });
  const spigenCase = await prisma.product.findUniqueOrThrow({ where: { slug: 'spigen-core-armor-iphone-15-pro' } });
  const powerBank = await prisma.product.findUniqueOrThrow({ where: { slug: 'anker-maggo-power-bank-10k' } });

  let demoAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!demoAddress) {
    demoAddress = await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: 'Demo Customer',
        phone: '+8801711000000',
        line1: 'House 12, Road 5, Banani',
        city: 'Dhaka',
        postalCode: '1213',
        country: 'Bangladesh',
      },
    });
  }

  const basketPatterns: { products: typeof iphone[]; count: number }[] = [
    { products: [iphone, spigenCase, powerBank], count: 8 },
    { products: [iphone, spigenCase], count: 5 },
    { products: [galaxy, powerBank], count: 6 },
    { products: [iphone], count: 4 },
    { products: [galaxy], count: 3 },
    { products: [powerBank], count: 3 },
    { products: [spigenCase], count: 2 },
  ];

  let orderSeq = 1;
  let ordersCreated = 0;
  for (const pattern of basketPatterns) {
    for (let i = 0; i < pattern.count; i++) {
      const orderNumber = `DEMO-${String(orderSeq).padStart(4, '0')}`;
      orderSeq += 1;

      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) continue;

      const lines = pattern.products.map((p) => ({
        productId: p.id,
        productName: p.name,
        productImage: null,
        unitPrice: p.price,
        quantity: 1,
        lineTotal: p.price,
      }));
      const total = lines.reduce((sum, l) => sum.add(l.lineTotal), new Prisma.Decimal(0));

      await prisma.order.create({
        data: {
          orderNumber,
          userId: customer.id,
          status: OrderStatus.DELIVERED,
          subtotal: total,
          shipping: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total,
          currency: 'BDT',
          shippingAddressId: demoAddress.id,
          items: { create: lines },
          payment: {
            create: {
              method: PaymentMethod.COD,
              status: PaymentStatus.SUCCEEDED,
              amount: total,
              currency: 'BDT',
              paidAt: new Date(),
            },
          },
        },
      });
      ordersCreated += 1;
    }
  }

  console.log(`  ✓ demo orders (${ordersCreated}) — click "Recompute" on the admin Recommendations page to generate rules`);

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
