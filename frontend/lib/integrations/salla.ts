import {
  BaseEcommerceClient,
  IntegrationError,
  refreshTokens,
} from "./base";
import {
  OAuthTokenResponse,
  CampaignData,
  OrderData,
  OrderItem,
  OAUTH_CONFIGS,
} from "@/types/integrations";

const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

/**
 * Salla E-commerce API Client
 * Documentation: https://docs.salla.dev/
 */
export class SallaClient extends BaseEcommerceClient {
  constructor(accessToken: string, refreshToken?: string) {
    super("salla", accessToken, refreshToken);
  }

  protected getBaseUrl(): string {
    return SALLA_API_BASE;
  }

  public async refreshAccessToken(): Promise<OAuthTokenResponse> {
    if (!this.refreshToken) {
      throw new IntegrationError(
        "No refresh token available",
        "salla"
      );
    }

    const clientId = process.env.SALLA_CLIENT_ID;
    const clientSecret = process.env.SALLA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new IntegrationError(
        "Salla credentials not configured",
        "salla"
      );
    }

    const tokens = await refreshTokens(
      OAUTH_CONFIGS.salla.tokenUrl,
      clientId,
      clientSecret,
      this.refreshToken
    );

    this.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token;
    }

    return tokens;
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
      data: {
        id: number;
        name: string;
        currency: string;
      };
    }>("/store/info");

    return {
      id: String(response.data.id),
      name: response.data.name,
      currency: response.data.currency || "SAR",
    };
  }

  public async fetchOrders(
    since?: Date,
    limit: number = 50
  ): Promise<OrderData[]> {
    const params = new URLSearchParams({
      per_page: String(limit),
    });

    if (since) {
      params.append("created_at[min]", since.toISOString());
    }

    const response = await this.request<{
      data: SallaOrderResponse[];
    }>(`/orders?${params.toString()}`);

    return response.data.map((order) => this.transformOrder(order));
  }

  public async fetchOrder(orderId: string): Promise<OrderData> {
    const response = await this.request<{
      data: SallaOrderResponse;
    }>(`/orders/${orderId}`);

    return this.transformOrder(response.data);
  }

  /**
   * Fetch campaigns - Not applicable for e-commerce, returns empty array
   */
  public async fetchCampaigns(): Promise<CampaignData[]> {
    return [];
  }

  /**
   * Get total revenue and order stats
   * Calculates stats from fetched orders since the statistics endpoint has issues
   */
  public async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }> {
    try {
      // Try the statistics endpoint first
      const response = await this.request<{
        data: {
          total_revenue: number;
          total_orders: number;
        };
      }>("/orders/statistics");

      const totalOrders = response.data.total_orders || 0;
      const totalRevenue = response.data.total_revenue || 0;

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      };
    } catch {
      // Fallback: Calculate from orders
      const orders = await this.fetchOrders(startDate, 100);
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
      data: Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        mobile: string;
        orders_count: number;
        total_spent: number;
      }>;
    }>(`/customers?per_page=${limit}`);

    return response.data.map((customer) => ({
      id: String(customer.id),
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      email: customer.email,
      phone: customer.mobile,
      totalOrders: customer.orders_count || 0,
      totalSpent: customer.total_spent || 0,
    }));
  }

  /**
   * Transform Salla order response to normalized OrderData
   */
  private transformOrder(order: SallaOrderResponse): OrderData {
    // Handle different response formats
    const amount = order.amounts?.total?.amount || order.total?.amount || 0;
    const currency = order.amounts?.total?.currency || order.total?.currency || "SAR";

    return {
      orderId: String(order.id),
      amount,
      currency,
      status: this.mapOrderStatus(order.status?.slug || order.status?.name || ""),
      customerId: order.customer?.id ? String(order.customer.id) : undefined,
      customerEmail: order.customer?.email,
      createdAt: new Date(order.created_at || order.date?.date || Date.now()).getTime(),
      items: (order.items || []).map((item) => this.transformOrderItem(item)),
      utmSource: order.source?.name,
      utmCampaign: order.source?.campaign,
    };
  }

  private transformOrderItem(item: SallaOrderItemResponse): OrderItem {
    return {
      productId: String(item.product?.id || item.id),
      name: item.name || "Unknown Product",
      quantity: item.quantity || 1,
      price: item.price?.amount || 0,
    };
  }

  private mapOrderStatus(
    status: string
  ): "pending" | "paid" | "refunded" | "cancelled" {
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
      case "delivered":
        return "paid";
      case "refunded":
        return "refunded";
      case "cancelled":
      case "canceled":
        return "cancelled";
      default:
        return "pending";
    }
  }
}

// Salla API Response Types
interface SallaOrderResponse {
  id: number;
  reference_id?: string;
  status?: {
    id: number;
    name: string;
    slug: string;
  };
  total?: {
    amount: number;
    currency: string;
  };
  amounts?: {
    total?: {
      amount: number;
      currency: string;
    };
  };
  date?: {
    date: string;
  };
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
  };
  items?: SallaOrderItemResponse[];
  source?: {
    name: string;
    campaign?: string;
  };
  created_at?: string;
}

interface SallaOrderItemResponse {
  id: number;
  name?: string;
  quantity?: number;
  price?: {
    amount: number;
    currency: string;
  };
  product?: {
    id: number;
    name: string;
  };
}

/**
 * Parse Salla webhook payload
 */
export function parseSallaWebhook(payload: Record<string, unknown>): {
  event: string;
  merchantId: number;
  data: Record<string, unknown>;
} {
  return {
    event: payload.event as string,
    merchantId: payload.merchant as number,
    data: payload.data as Record<string, unknown>,
  };
}

/**
 * Verify Salla webhook signature using Web Crypto API
 */
export async function verifySallaWebhook(
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

  // Convert to hex
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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
