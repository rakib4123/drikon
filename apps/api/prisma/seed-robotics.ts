/**
 * Drikon — robotics & gadgets starter catalog
 * Run (local):  pnpm --filter @drikon/api exec tsx prisma/seed-robotics.ts
 * Run (prod):   DATABASE_URL="<prod>" DIRECT_URL="<prod>" pnpm --filter @drikon/api exec tsx prisma/seed-robotics.ts
 *
 * Idempotent: upserts categories, brands, and demo products (by slug).
 * Prices/images are starter placeholders — edit them in the admin panel.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const img = (label: string) =>
  `https://placehold.co/800x800/14233f/f97316.png?text=${encodeURIComponent(label)}`;

const CATEGORIES = [
  { name: 'Microcontrollers', slug: 'microcontrollers', description: 'Boards & dev kits — Arduino, Raspberry Pi, ESP32.' },
  { name: 'Sensors & Modules', slug: 'sensors-modules', description: 'Distance, motion, temperature, vision and more.' },
  { name: 'Motors & Actuators', slug: 'motors-actuators', description: 'Servos, steppers, DC motors and drivers.' },
  { name: 'Robotic Parts', slug: 'robotic-parts', description: 'Chassis, wheels, grippers and mechanical bits.' },
  { name: 'Drones & FPV', slug: 'drones-fpv', description: 'Ready-to-fly drones, frames and FPV gear.' },
  { name: 'Components', slug: 'components', description: 'Drivers, batteries, ICs and passives.' },
  { name: 'Tools & Gear', slug: 'tools-gear', description: 'Breadboards, jumper wires, soldering and prototyping.' },
  { name: 'Gadgets', slug: 'gadgets', description: 'Cameras, displays and smart-home gadgets.' },
];

const BRANDS = [
  { name: 'Arduino', slug: 'arduino' },
  { name: 'Raspberry Pi', slug: 'raspberry-pi' },
  { name: 'Espressif', slug: 'espressif' },
  { name: 'DJI', slug: 'dji' },
  { name: 'DFRobot', slug: 'dfrobot' },
  { name: 'Drikon', slug: 'drikon' },
];

type Seed = {
  name: string; slug: string; sku: string; price: number; stock: number;
  category: string; brand?: string; featured?: boolean; short: string; desc: string;
  attrs?: Record<string, string>;
};

const PRODUCTS: Seed[] = [
  { name: 'Arduino Uno R3', slug: 'arduino-uno-r3', sku: 'MCU-UNO-R3', price: 1200, stock: 60, category: 'microcontrollers', brand: 'arduino', featured: true,
    short: 'The classic ATmega328P dev board for makers.', desc: 'The Arduino Uno R3 is the most popular board to start building electronics. ATmega328P MCU, 14 digital I/O, 6 analog inputs, USB programming. Perfect for robotics, sensors and prototyping.',
    attrs: { MCU: 'ATmega328P', 'Digital I/O': '14', 'Analog in': '6', Voltage: '5V' } },
  { name: 'Raspberry Pi 4 Model B (4GB)', slug: 'raspberry-pi-4-4gb', sku: 'SBC-RPI4-4G', price: 9500, stock: 25, category: 'microcontrollers', brand: 'raspberry-pi', featured: true,
    short: 'Quad-core single-board computer, 4GB RAM.', desc: 'Raspberry Pi 4 Model B with 4GB RAM — a full Linux computer for vision, AI and robotics projects. Dual 4K HDMI, USB 3.0, Gigabit Ethernet, Wi-Fi and Bluetooth.',
    attrs: { CPU: 'Quad-core Cortex-A72', RAM: '4GB', Connectivity: 'Wi-Fi + BT 5.0' } },
  { name: 'ESP32 DevKit V1', slug: 'esp32-devkit-v1', sku: 'MCU-ESP32-V1', price: 750, stock: 80, category: 'microcontrollers', brand: 'espressif', featured: true,
    short: 'Wi-Fi + Bluetooth MCU for IoT & robotics.', desc: 'ESP32 DevKit V1 — dual-core 240MHz MCU with built-in Wi-Fi and Bluetooth. Tons of GPIO, ADC and PWM. The go-to board for connected gadgets and robots.',
    attrs: { Cores: '2 × 240MHz', Wireless: 'Wi-Fi + BT', GPIO: '30+' } },
  { name: 'HC-SR04 Ultrasonic Sensor', slug: 'hc-sr04-ultrasonic', sku: 'SEN-HCSR04', price: 120, stock: 200, category: 'sensors-modules',
    short: 'Distance sensing from 2cm to 400cm.', desc: 'HC-SR04 ultrasonic distance sensor — measures 2–400cm with ±3mm accuracy. The standard obstacle-avoidance sensor for robots.',
    attrs: { Range: '2–400 cm', Interface: 'Trig/Echo', Voltage: '5V' } },
  { name: 'MPU-6050 6-Axis IMU', slug: 'mpu6050-imu', sku: 'SEN-MPU6050', price: 180, stock: 150, category: 'sensors-modules', brand: 'dfrobot',
    short: '3-axis gyro + 3-axis accelerometer.', desc: 'MPU-6050 combines a 3-axis gyroscope and 3-axis accelerometer over I2C — for balancing robots, drones and motion tracking.',
    attrs: { Axes: '6 (gyro + accel)', Interface: 'I2C', Voltage: '3.3–5V' } },
  { name: 'OLED 0.96" I2C Display', slug: 'oled-096-i2c', sku: 'DSP-OLED096', price: 320, stock: 120, category: 'sensors-modules',
    short: '128×64 monochrome OLED, I2C.', desc: '0.96-inch 128×64 OLED display with I2C interface — crisp, low-power readouts for any project. Works great with Arduino and ESP32.',
    attrs: { Resolution: '128×64', Interface: 'I2C', Size: '0.96"' } },
  { name: 'SG90 Micro Servo', slug: 'sg90-micro-servo', sku: 'MOT-SG90', price: 150, stock: 300, category: 'motors-actuators',
    short: '9g micro servo, 180° rotation.', desc: 'SG90 9g micro servo — 180° rotation, plastic gears, perfect for robot arms, pan-tilt rigs and small mechanisms.',
    attrs: { Torque: '1.8 kg·cm', Rotation: '180°', Weight: '9g' } },
  { name: 'NEMA 17 Stepper Motor', slug: 'nema-17-stepper', sku: 'MOT-NEMA17', price: 850, stock: 70, category: 'motors-actuators',
    short: '1.8° stepper for CNC & 3D printers.', desc: 'NEMA 17 bipolar stepper motor — 1.8° step angle, high torque. The workhorse for 3D printers, CNC and precise robotics.',
    attrs: { 'Step angle': '1.8°', Type: 'Bipolar', Current: '1.5A' } },
  { name: 'L298N Motor Driver', slug: 'l298n-motor-driver', sku: 'CMP-L298N', price: 160, stock: 180, category: 'components',
    short: 'Dual H-bridge, drive 2 DC motors.', desc: 'L298N dual H-bridge motor driver — control speed and direction of two DC motors or one stepper. Essential for robot cars.',
    attrs: { Channels: '2', 'Max current': '2A/ch', Voltage: '5–35V' } },
  { name: '4WD Robot Car Chassis Kit', slug: '4wd-robot-chassis', sku: 'RBT-4WD-KIT', price: 950, stock: 90, category: 'robotic-parts', brand: 'drikon', featured: true,
    short: 'Acrylic chassis + 4 motors & wheels.', desc: 'Complete 4WD robot car chassis kit — acrylic frame, four geared DC motors, wheels and hardware. The fastest way to a working rover.',
    attrs: { Drive: '4WD', Includes: 'Motors + wheels', Material: 'Acrylic' } },
  { name: 'DJI Tello Mini Drone', slug: 'dji-tello-drone', sku: 'DRN-TELLO', price: 15000, stock: 15, category: 'drones-fpv', brand: 'dji', featured: true,
    short: 'Programmable mini drone, 720p camera.', desc: 'DJI Tello — a lightweight programmable drone with a 720p camera and Scratch/Python SDK. Learn flight, vision and autonomy.',
    attrs: { Camera: '720p', 'Flight time': '13 min', SDK: 'Scratch / Python' } },
  { name: '18650 Li-ion Battery (3.7V)', slug: '18650-liion-battery', sku: 'CMP-18650', price: 350, stock: 250, category: 'components',
    short: 'Rechargeable 3.7V cell, 2600mAh.', desc: '18650 rechargeable lithium-ion cell — 3.7V, 2600mAh. Power your robots, drones and portable gadgets.',
    attrs: { Voltage: '3.7V', Capacity: '2600mAh', Type: 'Li-ion' } },
  { name: 'Breadboard 830 + Jumper Wires', slug: 'breadboard-jumper-kit', sku: 'TLS-BB830', price: 250, stock: 200, category: 'tools-gear', brand: 'drikon',
    short: '830-point breadboard + 65 jumpers.', desc: 'Solderless 830-point breadboard bundled with 65 flexible jumper wires — prototype circuits in minutes, no soldering.',
    attrs: { Points: '830', Includes: '65 jumpers', Reusable: 'Yes' } },
  { name: 'Raspberry Pi Camera Module 3', slug: 'rpi-camera-module-3', sku: 'GDT-RPICAM3', price: 4200, stock: 40, category: 'gadgets', brand: 'raspberry-pi',
    short: '12MP autofocus camera for the Pi.', desc: 'Raspberry Pi Camera Module 3 — 12MP Sony IMX708 sensor with autofocus and HDR. For computer vision, surveillance and photography projects.',
    attrs: { Sensor: '12MP IMX708', Focus: 'Autofocus', Video: '1080p50' } },
];

async function main() {
  console.log('🤖 Seeding robotics & gadgets catalog...');

  const catId: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    catId[c.slug] = row.id;
  }
  console.log(`  ✓ categories (${CATEGORIES.length})`);

  const brandId: Record<string, string> = {};
  for (const b of BRANDS) {
    const row = await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
    brandId[b.slug] = row.id;
  }
  console.log(`  ✓ brands (${BRANDS.length})`);

  for (const p of PRODUCTS) {
    const data = {
      name: p.name,
      description: p.desc,
      shortDescription: p.short,
      isActive: true,
      isFeatured: !!p.featured,
      categoryId: catId[p.category],
      brandId: p.brand ? brandId[p.brand] : null,
      attributes: (p.attrs ?? {}) as Prisma.InputJsonValue,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: {
        ...data,
        slug: p.slug,
        sku: p.sku,
        price: new Prisma.Decimal(p.price),
        currency: 'BDT',
        stock: p.stock,
      },
    });
    // Ensure one placeholder image without clobbering uploaded ones.
    const imgCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imgCount === 0) {
      await prisma.productImage.create({ data: { productId: product.id, url: img(p.name), alt: p.name, position: 0 } });
    }
  }
  console.log(`  ✓ products (${PRODUCTS.length})`);
  console.log('\n✅ Robotics catalog seeded. Edit prices & images in the admin panel.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
