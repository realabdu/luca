import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { decryptAsync } from "@/lib/encryption";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

const TEST_PRODUCTS = [
  {
    name: "قميص رجالي كلاسيك",
    price: 149,
    description: "قميص رجالي أنيق مصنوع من القطن الفاخر",
    sku: "SHIRT-001",
  },
  {
    name: "حقيبة يد نسائية",
    price: 299,
    description: "حقيبة يد فاخرة من الجلد الطبيعي",
    sku: "BAG-001",
  },
  {
    name: "ساعة ذكية",
    price: 599,
    description: "ساعة ذكية مع متتبع اللياقة البدنية",
    sku: "WATCH-001",
  },
  {
    name: "سماعات بلوتوث",
    price: 199,
    description: "سماعات لاسلكية عالية الجودة",
    sku: "HEADPHONE-001",
  },
  {
    name: "عطر رجالي فاخر",
    price: 450,
    description: "عطر فرنسي فاخر للرجال",
    sku: "PERFUME-001",
  },
];

/**
 * POST /api/test/salla-setup
 * Creates test products and a branch in the Salla store
 */
export async function POST(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const sallaCredentials = await client.query(api.integrations.getCredentials, { platform: "salla" });

    if (!sallaCredentials) {
      return NextResponse.json({ error: "Salla not connected" }, { status: 400 });
    }

    const accessToken = await decryptAsync(sallaCredentials.accessToken);
    const results = {
      products: { created: [] as any[], errors: [] as any[] },
      branch: null as any,
    };

    // Create test products
    for (const product of TEST_PRODUCTS) {
      try {
        const productPayload = {
          name: product.name,
          price: product.price,
          description: product.description,
          sku: product.sku,
          product_type: "product",
          quantity: 100, // Stock quantity
          status: "sale", // Available for sale
        };

        const response = await fetch(`${SALLA_API_BASE}/products`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productPayload),
        });

        if (response.ok) {
          const data = await response.json();
          results.products.created.push({
            id: data.data?.id,
            name: product.name,
            price: product.price,
          });
        } else {
          const errorText = await response.text();
          results.products.errors.push({
            name: product.name,
            error: errorText,
          });
        }
      } catch (err) {
        results.products.errors.push({
          name: product.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Check if branch exists, if not create one
    const branchesResponse = await fetch(`${SALLA_API_BASE}/branches`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (branchesResponse.ok) {
      const branchesData = await branchesResponse.json();
      if (branchesData.data?.length > 0) {
        results.branch = {
          existing: true,
          id: branchesData.data[0].id,
          name: branchesData.data[0].name,
        };
      } else {
        // Create a branch
        try {
          const branchPayload = {
            name: "الفرع الرئيسي",
            city_id: 1, // Riyadh
            address_description: "الرياض - حي العليا",
            contact_number: "+966500000000",
          };

          const branchResponse = await fetch(`${SALLA_API_BASE}/branches`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(branchPayload),
          });

          if (branchResponse.ok) {
            const branchData = await branchResponse.json();
            results.branch = {
              created: true,
              id: branchData.data?.id,
              name: "الفرع الرئيسي",
            };
          } else {
            const errorText = await branchResponse.text();
            results.branch = { error: errorText };
          }
        } catch (err) {
          results.branch = { error: err instanceof Error ? err.message : "Unknown error" };
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        productsCreated: results.products.created.length,
        productErrors: results.products.errors.length,
        branchStatus: results.branch?.created ? "created" : results.branch?.existing ? "exists" : "failed",
      },
      details: results,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to setup test data" },
      { status: 500 }
    );
  }
}
