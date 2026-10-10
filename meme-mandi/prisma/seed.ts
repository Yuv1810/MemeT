import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const products = [
  {
    slug: "kya-scene-hai",
    name: "The Scene Setter",
    description:
      "For the friend who has a plan for absolutely everything. A relaxed ivory tee with an original Kya Scene Hai print and a little chai energy. Easy to wear. Hard to explain to your relatives.",
    category: "T-shirts",
    fit: "Oversized",
    fabric: "100% cotton · 240 GSM",
    image: "/images/kya-scene-hai-ivory-tee.png",
    tag: "FRESH DROP",
    color: "Ivory",
    colorHex: "#e7e4d9",
    pricePaise: 79900,
    compareAtPaise: 99900,
    prefix: "MM-SCENE-IV",
  },
  {
    slug: "kal-dekhenge",
    name: "The Kal Dekhenge Club",
    description:
      "Deadlines are temporary. The kal dekhenge mindset is forever. An original cream print on a washed black oversized tee, made for your next very productive chai break.",
    category: "T-shirts",
    fit: "Oversized",
    fabric: "100% cotton · 240 GSM",
    image: "/images/kal-dekhenge-black-tee.png",
    tag: "MOOD OF THE DAY",
    color: "Washed black",
    colorHex: "#242526",
    pricePaise: 84900,
    compareAtPaise: 109900,
    prefix: "MM-KAL-BK",
  },
  {
    slug: "overthinking-department",
    name: "Overthinking Department",
    description:
      "Official uniform of the committee that replays every conversation. An indigo hoodie with an original Overthinking Department chest print. Big comfort. Bigger thoughts.",
    category: "Hoodies",
    fit: "Oversized",
    fabric: "Cotton blend · 320 GSM fleece",
    image: "/images/overthinking-indigo-hoodie.png",
    tag: "HOODIE SEASON",
    color: "Indigo",
    colorHex: "#3e46a0",
    pricePaise: 149900,
    compareAtPaise: 189900,
    prefix: "MM-OT-IN",
  },
];
async function main() {
  for (const { color, colorHex, pricePaise, compareAtPaise, prefix, ...product } of products) {
    // Idempotent seed never overwrites products the owner has edited.
    if (await db.product.findUnique({ where: { slug: product.slug } })) continue;
    await db.product.create({
      data: {
        ...product,
        variants: {
          create: ["S", "M", "L", "XL", "2XL"].map((size) => ({
            color,
            colorHex,
            size,
            pricePaise,
            compareAtPaise,
            sku: `${prefix}-${size}`,
            qikinkSku: null,
            designs: [],
            searchFromMyProducts: false,
          })),
        },
      },
    });
  }
  console.log("Catalog seeded. No Qikink SKUs or accounts were fabricated.");
}
main().finally(() => db.$disconnect());
