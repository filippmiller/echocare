import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Seed Cities
  console.log("📍 Seeding cities...");
  const spb = await prisma.city.upsert({
    where: { code: "SPB" },
    update: {},
    create: {
      code: "SPB",
      nameRu: "Санкт-Петербург",
      nameEn: "Saint Petersburg",
      sortOrder: 1,
    },
  });

  const msk = await prisma.city.upsert({
    where: { code: "MSK" },
    update: {},
    create: {
      code: "MSK",
      nameRu: "Москва",
      nameEn: "Moscow",
      sortOrder: 2,
    },
  });

  console.log(`✅ Cities seeded: ${spb.nameRu}, ${msk.nameRu}`);

  // Seed Service Categories
  console.log("📂 Seeding service categories...");

  const beautyCategory = await prisma.serviceCategory.upsert({
    where: { code: "BEAUTY" },
    update: {},
    create: {
      code: "BEAUTY",
      nameRu: "Красота и уход",
      nameEn: "Beauty & Care",
      icon: "scissors",
      sortOrder: 1,
    },
  });

  const dryCleaningCategory = await prisma.serviceCategory.upsert({
    where: { code: "DRY_CLEANING" },
    update: {},
    create: {
      code: "DRY_CLEANING",
      nameRu: "Химчистка",
      nameEn: "Dry Cleaning",
      icon: "tshirt",
      sortOrder: 2,
    },
  });

  const keysShoesCategory = await prisma.serviceCategory.upsert({
    where: { code: "KEYS_SHOES" },
    update: {},
    create: {
      code: "KEYS_SHOES",
      nameRu: "Ключи и ремонт обуви",
      nameEn: "Keys & Shoe Repair",
      icon: "key",
      sortOrder: 3,
    },
  });

  const foodDrinkCategory = await prisma.serviceCategory.upsert({
    where: { code: "FOOD_DRINK" },
    update: {},
    create: {
      code: "FOOD_DRINK",
      nameRu: "Кофе/еда",
      nameEn: "Food & Drink",
      icon: "coffee",
      sortOrder: 4,
    },
  });

  console.log(`✅ Categories seeded: ${beautyCategory.nameRu}, ${dryCleaningCategory.nameRu}, ${keysShoesCategory.nameRu}, ${foodDrinkCategory.nameRu}`);

  // Seed Service Types
  console.log("🔧 Seeding service types...");

  // BEAUTY services
  await prisma.serviceType.upsert({
    where: { code: "female_haircut" },
    update: {},
    create: {
      code: "female_haircut",
      categoryId: beautyCategory.id,
      nameRu: "Женская стрижка",
      nameEn: "Women's Haircut",
      defaultDurationMinutes: 60,
      pricingUnit: "PER_SERVICE",
      isActive: true,
    },
  });

  await prisma.serviceType.upsert({
    where: { code: "male_haircut" },
    update: {},
    create: {
      code: "male_haircut",
      categoryId: beautyCategory.id,
      nameRu: "Мужская стрижка",
      nameEn: "Men's Haircut",
      defaultDurationMinutes: 30,
      pricingUnit: "PER_SERVICE",
      isActive: true,
    },
  });

  await prisma.serviceType.upsert({
    where: { code: "beard_trim" },
    update: {},
    create: {
      code: "beard_trim",
      categoryId: beautyCategory.id,
      nameRu: "Стрижка бороды",
      nameEn: "Beard Trim",
      defaultDurationMinutes: 20,
      pricingUnit: "PER_SERVICE",
      isActive: true,
    },
  });

  await prisma.serviceType.upsert({
    where: { code: "manicure_classic" },
    update: {},
    create: {
      code: "manicure_classic",
      categoryId: beautyCategory.id,
      nameRu: "Маникюр (классический)",
      nameEn: "Classic Manicure",
      defaultDurationMinutes: 60,
      pricingUnit: "PER_SERVICE",
      isActive: true,
    },
  });

  // DRY_CLEANING services
  await prisma.serviceType.upsert({
    where: { code: "dry_cleaning_coat" },
    update: {},
    create: {
      code: "dry_cleaning_coat",
      categoryId: dryCleaningCategory.id,
      nameRu: "Химчистка пальто",
      nameEn: "Coat Dry Cleaning",
      defaultDurationMinutes: null,
      pricingUnit: "PER_ITEM",
      isActive: true,
    },
  });

  await prisma.serviceType.upsert({
    where: { code: "dry_cleaning_suit" },
    update: {},
    create: {
      code: "dry_cleaning_suit",
      categoryId: dryCleaningCategory.id,
      nameRu: "Химчистка костюма",
      nameEn: "Suit Dry Cleaning",
      defaultDurationMinutes: null,
      pricingUnit: "PER_ITEM",
      isActive: true,
    },
  });

  // KEYS_SHOES services
  await prisma.serviceType.upsert({
    where: { code: "key_cutting_standard" },
    update: {},
    create: {
      code: "key_cutting_standard",
      categoryId: keysShoesCategory.id,
      nameRu: "Изготовление обычных ключей",
      nameEn: "Standard Key Cutting",
      defaultDurationMinutes: 15,
      pricingUnit: "PER_ITEM",
      isActive: true,
    },
  });

  console.log("✅ Service types seeded");

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

