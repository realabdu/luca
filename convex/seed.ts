import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthContext } from "./lib/auth";

export const seedDatabase = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get organization context
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);

    // Check if data already exists for this organization
    const existingCampaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();
    if (existingCampaigns) {
      return { message: "Database already seeded for this organization" };
    }

    // Seed campaigns
    const campaigns = [
      { name: "Eid Al-Adha Promo", platform: "TikTok" as const, status: "Active" as const, spend: 1200, revenue: 12000, roas: 10.0, cpa: 12 },
      { name: "Retargeting - Cart Abandoners", platform: "Snapchat" as const, status: "Active" as const, spend: 500, revenue: 3500, roas: 7.0, cpa: 15 },
      { name: "Brand Awareness Q3", platform: "Meta" as const, status: "Paused" as const, spend: 2000, revenue: 0, roas: 0.0, cpa: 0 },
      { name: "Search - High Intent", platform: "Google" as const, status: "Learning" as const, spend: 4120, revenue: 16400, roas: 3.9, cpa: 45 },
      { name: "KSA National Day Teaser", platform: "X" as const, status: "Active" as const, spend: 800, revenue: 2400, roas: 3.0, cpa: 22 },
    ];

    for (const campaign of campaigns) {
      await ctx.db.insert("campaigns", { ...campaign, organizationId });
    }

    // Seed attribution events
    const now = Date.now();
    const events = [
      { timestamp: now, amount: 450, source: "TikTok" as const, campaign: "Summer_Sale_v2", creativeUrl: "https://picsum.photos/id/1/200/120", status: "Paid" as const },
      { timestamp: now - 4 * 60000, amount: 120.50, source: "Google" as const, campaign: '"best perfumes"', creativeUrl: "", status: "Pending" as const },
      { timestamp: now - 12 * 60000, amount: 990, source: "Snapchat" as const, campaign: "Influencer_Pack", creativeUrl: "https://picsum.photos/id/2/200/120", status: "Paid" as const },
      { timestamp: now - 15 * 60000, amount: 230, source: "Meta" as const, campaign: "Retargeting_Q3", creativeUrl: "https://picsum.photos/id/3/200/120", status: "Paid" as const },
    ];

    for (const event of events) {
      await ctx.db.insert("attributionEvents", { ...event, organizationId });
    }

    // Seed performance data
    const performanceData = [
      { date: "1 Nov", revenue: 22000, spend: 12000 },
      { date: "5 Nov", revenue: 35000, spend: 15000 },
      { date: "10 Nov", revenue: 28000, spend: 18000 },
      { date: "15 Nov", revenue: 45000, spend: 20000 },
      { date: "20 Nov", revenue: 52000, spend: 22000 },
      { date: "25 Nov", revenue: 68000, spend: 25000 },
      { date: "30 Nov", revenue: 60000, spend: 23000 },
    ];

    for (const data of performanceData) {
      await ctx.db.insert("performanceData", { ...data, organizationId });
    }

    // Seed platform spend
    const platformSpend = [
      { platform: "Meta Ads", percentage: 40, color: "#107a76" },
      { platform: "Google Ads", percentage: 25, color: "#2e8f8b" },
      { platform: "TikTok", percentage: 20, color: "#6bb8b5" },
      { platform: "Snapchat", percentage: 15, color: "#cbd5e1" },
    ];

    for (const spend of platformSpend) {
      await ctx.db.insert("platformSpend", { ...spend, organizationId });
    }

    // Seed metrics
    const metrics = [
      { label: "Total Spend", value: "14,500", unit: "SAR", trend: 12, trendLabel: "vs last period", icon: "payments", trendType: "up" as const, order: 1 },
      { label: "Total Revenue", value: "168,200", unit: "SAR", trend: 24, trendLabel: "vs last period", icon: "monitoring", trendType: "up" as const, order: 2 },
      { label: "Blended ROAS", value: "11.6", trend: 5, trendLabel: "vs last period", icon: "percent", trendType: "up" as const, color: "primary", order: 3 },
      { label: "Avg CPA", value: "18.5", unit: "SAR", trend: 2, trendLabel: "vs last period", icon: "group_add", trendType: "down" as const, order: 4 },
    ];

    for (const metric of metrics) {
      await ctx.db.insert("metrics", { ...metric, organizationId });
    }

    return { message: "Database seeded successfully" };
  },
});

export const clearDatabase = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getAuthContext(ctx, args.clerkOrgId);
    const tables = ["campaigns", "attributionEvents", "performanceData", "platformSpend", "metrics"] as const;

    for (const table of tables) {
      const records = await ctx.db
        .query(table)
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }

    return { message: "Database cleared for this organization" };
  },
});
