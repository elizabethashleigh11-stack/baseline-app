import { PrismaClient } from "@prisma/client";
import { CONTEXT_CATEGORIES } from "../lib/shared/category-taxonomy";

const prisma = new PrismaClient();

async function main() {
  for (const [mainKey, data] of Object.entries(CONTEXT_CATEGORIES)) {
    for (const sub of data.subcategories) {
      await prisma.categoryPair.upsert({
        where: {
          mainCategory_subcategory: {
            mainCategory: mainKey,
            subcategory: sub,
          },
        },
        update: {},
        create: { mainCategory: mainKey, subcategory: sub },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
