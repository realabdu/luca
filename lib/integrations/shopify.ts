import {
  BaseEcommerceClient,
  IntegrationError,
} from "./base";
import {
  OAuthTokenResponse,
  CampaignData,
  OrderData,
  OrderItem,
} from "@/types/integrations";

const SHOPIFY_API_VERSION = "2025-01";

/**
 * Shopify E-commerce API Client
 * Documentation: https://shopify.dev/docs/api/admin-rest
 */
export class ShopifyClient extends BaseEcommerceClient {
  private shopDomain: string;

  constructor(accessToken: string, shopDomain: string) {
    // Shopify offline tokens don't expire, so no refresh token needed
    super("shopify", accessToken, undefined);
    this.shopDomain = shopDomain;
    // Override base URL after super() since we need shopDomain
    this.baseUrl = this.getBaseUrl();
  }

  protected getBaseUrl(): string {
    return `https://${this.shopDomain}/admin/api/${SHOPIFY_API_VERSION}`;
  }

  /**
   * Override auth headers for Shopify
   * Shopify uses X-Shopify-Access-Token header instead of Bearer token
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      "X-Shopify-Access-Token": this.accessToken,
    };
  }

  /**
   * Shopify offline tokens don't expire - no refresh needed
   */
  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    throw new IntegrationError(
      "Shopify offline tokens don't expire - refresh not needed",
      "shopify"
    );
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.getStoreInfo();
      return true;
    } catch {
      return false;
    }
  }

  public async getStoreInfo(): Promise<{
    id: string;
    name: string;
    currency: string;
  }> {
    const response = await this.request<{
      shop: {
        id: number;
        name: string;
        currency: string;
        domain: string;
        myshopify_domain: string;
      };
    }>("/shop.json");

    return {
      id: String(response.shop.id),
      name: response.shop.name,
      currency: response.shop.currency || "USD",
    };
  }

  public async fetchOrders(
    since?: Date,
    limit: number = 50
  ): Promise<OrderData[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      status: "any",
    });

    if (since) {
      params.append("created_at_min", since.toISOString());
    }

    const response = await this.request<{
      orders: ShopifyOrderResponse[];
    }>(`/orders.json?${params.toString()}`);

    return response.orders.map((order) => this.transformOrder(order));
  }

  public async fetchOrder(orderId: string): Promise<OrderData> {
    const response = await this.request<{
      order: ShopifyOrderResponse;
    }>(`/orders/${orderId}.json`);

    return this.transformOrder(response.order);
  }

  /**
   * Fetch campaigns - Not applicable for e-commerce, returns empty array
   */
  public async fetchCampaigns(): Promise<CampaignData[]> {
    return [];
  }

  /**
   * Get total revenue and order stats
   */
  public async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }> {
    // Shopify doesn't have a dedicated statistics endpoint like Salla
    // Calculate from orders
    const orders = await this.fetchOrders(startDate, 250);
    const filteredOrders = endDate
      ? orders.filter(o => o.createdAt <= endDate.getTime())
      : orders;

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.amount, 0);
    const totalOrders = filteredOrders.length;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }

  /**
   * Get customers list
   */
  public async fetchCustomers(limit: number = 50): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      totalOrders: number;
      totalSpent: number;
    }>
  > {
    const response = await this.request<{
      customers: Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        orders_count: number;
        total_spent: string;
      }>;
    }>(`/customers.json?limit=${limit}`);

    return response.customers.map((customer) => ({
      id: String(customer.id),
      name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown",
      email: customer.email,
      phone: customer.phone,
      totalOrders: customer.orders_count || 0,
      totalSpent: parseFloat(customer.total_spent) || 0,
    }));
  }

  /**
   * Transform Shopify order response to normalized OrderData
   */
  private transformOrder(order: ShopifyOrderResponse): OrderData {
    // Extract UTM parameters from landing_site URL
    const utmParams = this.extractUtmParams(order.landing_site);

    return {
      orderId: String(order.id),
      amount: parseFloat(order.total_price) || 0,
      currency: order.currency || "USD",
      status: this.mapOrderStatus(order.financial_status),
      customerId: order.customer?.id ? String(order.customer.id) : undefined,
      customerEmail: order.customer?.email || order.email,
      createdAt: new Date(order.created_at).getTime(),
      items: (order.line_items || []).map((item) => this.transformOrderItem(item)),
      utmSource: utmParams.utm_source || order.source_name,
      utmMedium: utmParams.utm_medium,
      utmCampaign: utmParams.utm_campaign,
    };
  }

  private transformOrderItem(item: ShopifyLineItem): OrderItem {
    return {
      productId: String(item.product_id || item.id),
      name: item.name || item.title || "Unknown Product",
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
    };
  }

  private mapOrderStatus(
    financialStatus: string
  ): "pending" | "paid" | "refunded" | "cancelled" {
    switch (financialStatus?.toLowerCase()) {
      case "paid":
      case "partially_paid":
        return "paid";
      case "refunded":
      case "partially_refunded":
        return "refunded";
      case "voided":
        return "cancelled";
      case "pending":
      case "authorized":
      default:
        return "pending";
    }
  }

  private extractUtmParams(landingSite?: string): {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  } {
    if (!landingSite) return {};

    try {
      const url = new URL(landingSite);
      return {
        utm_source: url.searchParams.get("utm_source") || undefined,
        utm_medium: url.searchParams.get("utm_medium") || undefined,
        utm_campaign: url.searchParams.get("utm_campaign") || undefined,
      };
    } catch {
      return {};
    }
  }
}

// Shopify API Response Types
interface ShopifyOrderResponse {
  id: number;
  name: string;
  order_number: number;
  email?: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  source_name?: string;
  landing_site?: string;
  referring_site?: string;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items?: ShopifyLineItem[];
}

interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  name?: string;
  title?: string;
  quantity: number;
  price: string;
  sku?: string;
}

/**
 * Parse Shopify webhook payload
 */
export function parseShopifyWebhook(payload: Record<string, unknown>): {
  id: number;
  data: Record<string, unknown>;
} {
  return {
    id: payload.id as number,
    data: payload,
  };
}

/**
 * Verify Shopify webhook signature using Web Crypto API
 * Shopify uses Base64 encoded HMAC-SHA256
 */
export async function verifyShopifyWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  // Import the secret key
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  // Convert to base64 (Shopify uses base64, not hex like Salla)
  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Exchange Shopify authorization code for access token
 * Shopify has a different token exchange flow
 */
export async function exchangeShopifyTokens(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify token exchange failed: ${error}`);
  }

  return response.json();
}
