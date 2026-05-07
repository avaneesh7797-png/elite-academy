import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home & Garden", slug: "home-and-garden" },
  { name: "Collectibles", slug: "collectibles" },
  { name: "Sports", slug: "sports" },
  { name: "Vehicles", slug: "vehicles" },
  { name: "Toys & Hobbies", slug: "toys-and-hobbies" },
  { name: "Books & Media", slug: "books-and-media" },
];

const SAMPLE = [
  {
    title: "Vintage Polaroid SX-70 Camera",
    description: "Beautiful folding instant camera in excellent working condition. Comes with a leather case. Perfect for collectors and instant film fans.",
    imageUrl: "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=800&q=80",
    category: "collectibles",
    condition: "USED",
    startPrice: 89,
    buyNowPrice: 220,
    durationHours: 72,
  },
  {
    title: "Apple MacBook Pro 14\" M3 Pro",
    description: "Like-new MacBook Pro with 18GB RAM, 512GB SSD. Original box and charger included. Battery health 99%.",
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    category: "electronics",
    condition: "USED",
    startPrice: 1200,
    buyNowPrice: 1750,
    durationHours: 168,
  },
  {
    title: "Levi's 501 Vintage Jeans (Made in USA)",
    description: "Classic 501s from the 90s. Size 32x32. Beautiful natural fade, no rips or stains.",
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80",
    category: "fashion",
    condition: "USED",
    startPrice: 25,
    buyNowPrice: 75,
    durationHours: 48,
  },
  {
    title: "Nintendo Switch OLED + 6 Games",
    description: "Switch OLED with white Joy-Cons, dock, and 6 popular games. Hardly used.",
    imageUrl: "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=800&q=80",
    category: "electronics",
    condition: "USED",
    startPrice: 200,
    buyNowPrice: 350,
    durationHours: 24,
  },
  {
    title: "Wilson Pro Staff RF97 Tennis Racquet",
    description: "Roger Federer signature model. Strung with Luxilon. Light cosmetic wear, plays beautifully.",
    imageUrl: "https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800&q=80",
    category: "sports",
    condition: "USED",
    startPrice: 80,
    buyNowPrice: 180,
    durationHours: 96,
  },
  {
    title: "Mid-Century Modern Lounge Chair",
    description: "Walnut frame with cognac leather upholstery. Some patina that adds character. Local pickup preferred.",
    imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80",
    category: "home-and-garden",
    condition: "USED",
    startPrice: 350,
    buyNowPrice: null,
    durationHours: 120,
  },
  {
    title: "First Edition The Hobbit (1966 reprint)",
    description: "Hardcover with original dust jacket. Minor wear to spine. A wonderful piece for any Tolkien fan.",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    category: "books-and-media",
    condition: "USED",
    startPrice: 40,
    buyNowPrice: 120,
    durationHours: 168,
  },
  {
    title: "LEGO Star Wars Millennium Falcon (75257)",
    description: "Brand new in sealed box. 1,353 pieces. Discontinued set, perfect gift or display piece.",
    imageUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80",
    category: "toys-and-hobbies",
    condition: "NEW",
    startPrice: 120,
    buyNowPrice: 200,
    durationHours: 72,
  },
];

async function main() {
  console.log("Seeding categories...");
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  const demoEmail = "demo@elitebids.test";
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: "Demo Seller",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  const buyerEmail = "buyer@elitebids.test";
  await prisma.user.upsert({
    where: { email: buyerEmail },
    update: {},
    create: {
      email: buyerEmail,
      name: "Demo Buyer",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  // Don't re-seed listings if any exist.
  const existing = await prisma.listing.count();
  if (existing > 0) {
    console.log(`Found ${existing} listings, skipping listing seed.`);
    return;
  }

  console.log("Seeding sample listings...");
  for (const item of SAMPLE) {
    const category = await prisma.category.findUnique({ where: { slug: item.category } });
    if (!category) continue;
    await prisma.listing.create({
      data: {
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        condition: item.condition,
        startPrice: item.startPrice,
        currentPrice: item.startPrice,
        buyNowPrice: item.buyNowPrice,
        endsAt: new Date(Date.now() + item.durationHours * 60 * 60 * 1000),
        sellerId: demoUser.id,
        categoryId: category.id,
      },
    });
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
