import { z } from "zod";
import { designSchema } from "./qikink";
const imageSchema = z
  .string()
  .max(2048)
  .refine(
    (v) => /^\/images\/[A-Za-z0-9._-]+$/.test(v) || /^https:\/\//.test(v),
    "Use a public HTTPS image URL or /images/filename.",
  );
export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    description: z.string().trim().min(10).max(2000),
    category: z.enum(["T-shirts", "Hoodies"]),
    fit: z.string().trim().min(2).max(40),
    fabric: z.string().trim().min(2).max(80),
    image: imageSchema,
    tag: z.string().trim().max(30).nullable().optional(),
    active: z.boolean(),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          sku: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
          qikinkSku: z.string().trim().max(80).nullable().optional(),
          color: z.string().trim().min(1).max(30),
          colorHex: z.string().regex(/^#[A-Fa-f0-9]{6}$/),
          size: z.enum(["S", "M", "L", "XL", "2XL"]),
          pricePaise: z.number().int().min(10000).max(10000000),
          compareAtPaise: z.number().int().positive().nullable().optional(),
          active: z.boolean(),
          searchFromMyProducts: z.boolean(),
          designs: z.array(designSchema),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((data, ctx) => {
    const combos = new Set<string>(),
      skus = new Set<string>();
    data.variants.forEach((v, i) => {
      const combo = `${v.color.toLowerCase()}|${v.size}`;
      if (combos.has(combo) || skus.has(v.sku))
        ctx.addIssue({
          code: "custom",
          path: ["variants", i],
          message: "Each colour, size, and SKU must be unique.",
        });
      combos.add(combo);
      skus.add(v.sku);
      if (v.compareAtPaise && v.compareAtPaise < v.pricePaise)
        ctx.addIssue({
          code: "custom",
          path: ["variants", i],
          message: "Compare-at price must be at least the selling price.",
        });
    });
  });
