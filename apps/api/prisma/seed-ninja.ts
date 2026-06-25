/**
 * Drikon — Ninja Robot hero product seed
 * Run (local):       pnpm --filter @drikon/api exec tsx prisma/seed-ninja.ts
 * Run (production):  DATABASE_URL="<prod-url>" pnpm --filter @drikon/api exec tsx prisma/seed-ninja.ts
 *
 * Idempotent: upserts a "Robotics" category, "Ninja" brand, the Ninja Robot
 * product (featured), and a homepage hero banner that points to it.
 *
 * NOTE: price and images are PLACEHOLDERS. Set the real price and upload the
 * real photos from the admin panel (Products → Ninja Robot, Banners → hero).
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder art — swap via the admin Cloudinary uploader once you have real photos.
const PRODUCT_IMG = 'https://placehold.co/900x1100/14233f/f97316.png?text=Ninja+Robot';
const BANNER_IMG = 'https://placehold.co/1600x800/14233f/f97316.png?text=Ninja+Robot';

const DESCRIPTION = `The Ninja Robot is an advanced, transformable robot designed for students, hobbyists, and STEM enthusiasts. This unique robot walks, dances, reacts to obstacles, shows emotions, and can instantly transform into a wheeled robot for high-speed movement — making it one of the most versatile educational robots you can build.

Powered by an ESP Ninja PCB, Ninja supports both Otto Blockly (block-based coding) and Arduino IDE (C++), allowing beginners and advanced learners to enjoy robotics programming.

With its expressive LED/OLED eyes, ultrasonic obstacle avoidance, and wireless control via mobile devices, Ninja brings creativity, movement, and personality into one compact robot.

All mechanical parts are optimized for FDM 3D printing, with easy assembly and no support materials required — perfect for makers, students, robotics clubs, and DIY engineers in Bangladesh.

✅ Features
🦾 Walks, dances & transforms into a wheeled robot
🚗 High-speed rolling mode with continuous rotation servos
👩‍💻 Beginner-friendly coding using Otto Blockly
💻 Advanced programming with Arduino IDE (C++)
🦇 Ultrasonic obstacle avoidance
👀 LED Matrix or OLED emotional eyes (interchangeable)
🔊 Plays emotional sounds & melodies
👇 Button input for interactive control
📱 Wireless communication for mobile/tablet remote control
🔧 Designed for easy assembly and maintenance
🌐 Fully open-source (code, hardware & design)

✅ 3D Printing Requirements
Recommended: FDM 3D printer · No supports or rafts needed · Layer height 0.2 mm or less · Infill 15%

✅ What Ninja Can Do
Walk like a biped · Transform into a wheeled robot · Roll at high speed · Dance & perform gestures · Show emotional expressions · Avoid obstacles · React to button inputs · Communicate wirelessly with phone/tablet

✅ Coding (Beginner to Advanced)
Start with Otto Blockly (drag-and-drop coding), then upgrade to Arduino IDE (C++) for advanced control. GitHub repository available for source code and examples.`;

const SHORT_DESCRIPTION =
  'Transformable open-source STEM robot — walks, dances, avoids obstacles, shows emotions, and rolls into a wheeled robot. Code it with Otto Blockly or Arduino IDE.';

// Spec rows (surface in the compare table + can be shown on the detail page).
const ATTRIBUTES: Prisma.InputJsonValue = {
  Controller: 'ESP32 Ninja PCB (or Wemos + Servo Shield)',
  Coding: 'Otto Blockly (blocks) + Arduino IDE (C++)',
  Servos: '2× 180° metal-gear + 2× 360° continuous rotation metal-gear',
  Wheels: '2× O-Ring wheels (68 mm OD / 60 mm ID)',
  Sensor: 'Ultrasonic HC-SR04 obstacle avoidance',
  Display: 'LED Matrix 16×8 (HT16K33) or 1.3" OLED — interchangeable',
  Audio: 'Buzzer module — emotional sounds & melodies',
  Connectivity: 'Wireless control via mobile / tablet',
  Battery: '9V Li-ion rechargeable (650 mAh) + UBEC 5V/3A regulator',
  Printing: 'FDM, no supports, 0.2 mm layers, 15% infill',
  License: 'Fully open-source (code, hardware & design)',
};

const PACKAGE_CONTENTS = [
  'Ninja PCB (ESP32) / Compatible Wemos + Servo Shield',
  'Micro USB Data Cable',
  '6F22 Rechargeable Li-ion 9V Battery (650mAh) with USB Charging',
  'Toggle Switch + UBEC Regulator (5V/3A) + Connectors',
  '2× Ninja Servo 180° (Metal Gear)',
  '2× Ninja Servo 360° Continuous Rotation (Metal Gear)',
  '2× O-Ring Wheels (68mm OD / 60mm ID)',
  'Ultrasonic Sensor HC-SR04',
  'Button Module',
  '4-pin & 3-pin Dupont Cables',
  'Buzzer Module',
  'Phillips Screwdriver (2.5×40mm)',
  '4× Metal Self-Tapping Screws (M2×5)',
  'LED Matrix 16×8 HT16K33 (Optional)',
  'OLED Display 1.3″ (Optional)',
  'Full set of 3D-printed parts (ankles, base, feet, legs, lids, band)',
];

async function main() {
  console.log('🥷 Seeding Ninja Robot hero product...');

  // ─── Category ───
  const category = await prisma.category.upsert({
    where: { slug: 'robotics' },
    update: {},
    create: {
      name: 'Robotics',
      slug: 'robotics',
      description: 'DIY robots, STEM kits, and programmable hardware.',
    },
  });
  console.log(`  ✓ category: ${category.name}`);

  // ─── Brand ───
  const brand = await prisma.brand.upsert({
    where: { slug: 'ninja' },
    update: {},
    create: { name: 'Ninja', slug: 'ninja' },
  });
  console.log(`  ✓ brand: ${brand.name}`);

  // ─── Product (featured) ───
  const product = await prisma.product.upsert({
    where: { slug: 'ninja-robot' },
    update: {
      name: 'Ninja Robot',
      description: DESCRIPTION,
      shortDescription: SHORT_DESCRIPTION,
      isFeatured: true,
      isActive: true,
      categoryId: category.id,
      brandId: brand.id,
      attributes: { ...ATTRIBUTES, 'Package contents': PACKAGE_CONTENTS },
      metaTitle: 'Ninja Robot — Transformable open-source STEM robot',
      metaDescription: SHORT_DESCRIPTION,
      // price/stock left untouched on update so admin edits stick.
    },
    create: {
      name: 'Ninja Robot',
      slug: 'ninja-robot',
      sku: 'NINJA-ROBOT-001',
      description: DESCRIPTION,
      shortDescription: SHORT_DESCRIPTION,
      price: new Prisma.Decimal(1), // PLACEHOLDER — set the real price in admin.
      currency: 'BDT',
      stock: 10,
      isActive: true,
      isFeatured: true,
      categoryId: category.id,
      brandId: brand.id,
      attributes: { ...ATTRIBUTES, 'Package contents': PACKAGE_CONTENTS },
      metaTitle: 'Ninja Robot — Transformable open-source STEM robot',
      metaDescription: SHORT_DESCRIPTION,
    },
  });
  console.log(`  ✓ product: ${product.name} (featured=${product.isFeatured})`);

  // Ensure at least one image (placeholder) without clobbering uploaded ones.
  const imgCount = await prisma.productImage.count({ where: { productId: product.id } });
  if (imgCount === 0) {
    await prisma.productImage.create({
      data: { productId: product.id, url: PRODUCT_IMG, alt: 'Ninja Robot', position: 0 },
    });
    console.log('  ✓ placeholder product image added');
  } else {
    console.log(`  • product already has ${imgCount} image(s) — left untouched`);
  }

  // ─── Hero banner ───
  const HERO_HEADING = 'Meet the Ninja Robot';
  const existingBanner = await prisma.banner.findFirst({ where: { heading: HERO_HEADING } });
  const bannerData = {
    heading: HERO_HEADING,
    subheading:
      'A transformable open-source STEM robot — walks, dances, avoids obstacles, and rolls at high speed. Code it your way.',
    ctaLabel: 'Explore the Ninja',
    ctaHref: '/products/ninja-robot',
    position: 0,
    isActive: true,
  };
  if (existingBanner) {
    await prisma.banner.update({ where: { id: existingBanner.id }, data: bannerData });
    console.log('  ✓ hero banner updated');
  } else {
    await prisma.banner.create({ data: { ...bannerData, imageUrl: BANNER_IMG } });
    console.log('  ✓ hero banner created');
  }

  console.log('✅ Ninja Robot is now the hero product.');
  console.log('   → Set the real price + upload photos in the admin panel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
