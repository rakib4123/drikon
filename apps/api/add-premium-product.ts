import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring premium demo product exists...');

  // Ensure category exists
  let category = await prisma.category.findUnique({
    where: { slug: 'laptops' }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Gaming and productivity laptops'
      }
    });
  }

  // Ensure brand exists
  let brand = await prisma.brand.findUnique({
    where: { slug: 'asus' }
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: 'ASUS ROG',
        slug: 'asus',
      }
    });
  }

  const slug = 'rog-astral-rtx5090-edition-20';

  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      attributes: { template: 'premium' },
      stock: 10,
    },
    create: {
      name: 'ROG Astral GeForce RTX 5090 Edition 20',
      slug,
      sku: 'ROG-5090-ED20',
      description: 'The ROG Astral GeForce RTX™ 5090 Edition 20 is a masterpiece of engineering, visual flair, and performance. It features a captivating curved AMOLED display that delivers dynamic 3D visuals and real-time data, and a transparent glass backplate that showcases the intricate design within.\n\n- Powered by the NVIDIA® Blackwell architecture and DLSS 4.5\n- Curved AMOLED display delivers dynamic 3D visuals\n- ROG-accented transparent glass backplate\n- Quad-fan design boosts air flow and pressure by 20%',
      shortDescription: 'A masterpiece of engineering, visual flair, and performance with a captivating curved AMOLED display.',
      price: 250000.00, // In BDT or relevant currency
      compareAtPrice: 280000.00,
      currency: 'BDT',
      stock: 10,
      isActive: true,
      categoryId: category.id,
      brandId: brand.id,
      attributes: {
        template: 'premium',
        "Graphics Engine": "NVIDIA® GeForce RTX™ 5090",
        "Video Memory": "32GB GDDR7",
        "Engine Clock": "OC mode : 2955 MHz\nDefault mode : 2925 MHz (Boost Clock)",
        "CUDA Core": "24576",
        "Memory Speed": "28 Gbps",
        "Memory Interface": "512-bit",
        "Resolution": "Digital Max Resolution 7680 x 4320",
        "Interface": "Yes x 2 (Native HDMI 2.1a)\nYes x 3 (Native DisplayPort 2.1a)\nHDCP Support Yes (2.3)",
      },
      images: {
        create: [
          {
            url: 'https://dlcdnwebimgs.asus.com/gain/B57C2619-21F6-4447-BFD7-82A1B8F5E77E/w1000/h732',
            alt: 'ROG Astral GeForce RTX 5090 Edition 20 Hero Image',
            position: 0
          },
          {
            url: 'https://dlcdnwebimgs.asus.com/gain/9B9F65B6-D1B0-4A63-8DB2-329F64B86D49/w1000/h732',
            alt: 'ROG Astral Backplate',
            position: 1
          },
          {
            url: 'https://dlcdnwebimgs.asus.com/gain/49C96720-D09D-4601-830D-51B4CD8A81AE/w1000/h732',
            alt: 'ROG Astral AMOLED Display',
            position: 2
          }
        ]
      }
    }
  });

  console.log(`Successfully upserted premium product: ${product.slug}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
