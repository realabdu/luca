import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { decryptAsync } from "@/lib/encryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

/**
 * POST /api/test/salla-orders
 * Creates test orders in the connected Salla store
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

    // First, get products from the store
    const productsResponse = await fetch(`${SALLA_API_BASE}/products?per_page=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!productsResponse.ok) {
      const error = await productsResponse.text();
      return NextResponse.json({ error: `Failed to fetch products: ${error}` }, { status: 500 });
    }

    const productsData = await productsResponse.json();
    const products = productsData.data || [];

    if (products.length === 0) {
      return NextResponse.json({
        error: "No products found in store. Please add at least one product first.",
        suggestion: "Go to your Salla dashboard and add a product"
      }, { status: 400 });
    }

    // Get branches for pickup orders
    const branchesResponse = await fetch(`${SALLA_API_BASE}/branches`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let branches: any[] = [];
    if (branchesResponse.ok) {
      const branchesData = await branchesResponse.json();
      branches = branchesData.data || [];
    }

    // Create test orders
    const testOrders = [
      {
        customer: {
          name: "أحمد محمد",
          mobile: "+966500000001",
          email: "ahmed@test.com",
        },
        amount: 150,
      },
      {
        customer: {
          name: "سارة علي",
          mobile: "+966500000002",
          email: "sara@test.com",
        },
        amount: 280,
      },
      {
        customer: {
          name: "محمد خالد",
          mobile: "+966500000003",
          email: "mohammed@test.com",
        },
        amount: 450,
      },
      {
        customer: {
          name: "فاطمة أحمد",
          mobile: "+966500000004",
          email: "fatima@test.com",
        },
        amount: 320,
      },
      {
        customer: {
          name: "عبدالله سعيد",
          mobile: "+966500000005",
          email: "abdullah@test.com",
        },
        amount: 199,
      },
    ];

    const createdOrders = [];
    const errors = [];

    for (const testOrder of testOrders) {
      try {
        // Pick a random product
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;

        const orderPayload: any = {
          customer: testOrder.customer,
          payment: {
            status: "paid",
            method: "cod",
            cash_on_delivery: {
              amount: product.price?.amount || product.price || 100,
              currency: "SAR",
            },
          },
          products: [
            {
              identifier_type: "id",
              identifier: product.id,
              quantity: quantity,
            },
          ],
        };

        // Only add delivery method if needed (some products are digital)
        // Skip delivery for now to simplify

        const orderResponse = await fetch(`${SALLA_API_BASE}/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderPayload),
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          createdOrders.push({
            id: orderData.data?.id,
            reference: orderData.data?.reference_id,
            customer: testOrder.customer.name,
            amount: orderData.data?.amounts?.total?.amount,
          });
        } else {
          const errorText = await orderResponse.text();
          errors.push({
            customer: testOrder.customer.name,
            error: errorText,
          });
        }
      } catch (err) {
        errors.push({
          customer: testOrder.customer.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdOrders.length,
      orders: createdOrders,
      errors: errors.length > 0 ? errors : undefined,
      storeInfo: {
        productsAvailable: products.length,
        branchesAvailable: branches.length,
      },
    });
  } catch (error) {
    console.error("Test orders error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create test orders" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/salla-orders
 * Check store status and available products
 */
export async function GET(request: NextRequest) {
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

    // Get store info
    const [storeResponse, productsResponse, branchesResponse, ordersResponse] = await Promise.all([
      fetch(`${SALLA_API_BASE}/store/info`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${SALLA_API_BASE}/products?per_page=5`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${SALLA_API_BASE}/branches`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${SALLA_API_BASE}/orders?per_page=5`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);

    const storeData = storeResponse.ok ? await storeResponse.json() : null;
    const productsData = productsResponse.ok ? await productsResponse.json() : null;
    const branchesData = branchesResponse.ok ? await branchesResponse.json() : null;
    const ordersData = ordersResponse.ok ? await ordersResponse.json() : null;

    return NextResponse.json({
      store: storeData?.data ? {
        id: storeData.data.id,
        name: storeData.data.name,
        currency: storeData.data.currency,
      } : null,
      products: {
        count: productsData?.data?.length || 0,
        items: productsData?.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price?.amount,
        })) || [],
      },
      branches: {
        count: branchesData?.data?.length || 0,
        items: branchesData?.data?.map((b: any) => ({
          id: b.id,
          name: b.name,
        })) || [],
      },
      orders: {
        count: ordersData?.data?.length || 0,
        recent: ordersData?.data?.map((o: any) => ({
          id: o.id,
          reference: o.reference_id,
          amount: o.amounts?.total?.amount || o.total?.amount || o.total,
          status: o.status?.name,
          rawAmounts: o.amounts, // Debug
        })) || [],
      },
    });
  } catch (error) {
    console.error("Store check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check store" },
      { status: 500 }
    );
  }
}
