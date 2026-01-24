import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync ad spend from all ad platforms every 30 minutes
// Fetches Snapchat, Meta, Google, TikTok spend data
crons.interval(
  "sync-ad-spend",
  { minutes: 30 },
  internal.sync.syncAllAdSpend
);

// Sync campaigns from all ad platforms every 2 hours
// Campaign structure changes less frequently than spend
crons.interval(
  "sync-campaigns",
  { hours: 2 },
  internal.sync.syncAllCampaigns
);

// Calculate and store aggregated daily metrics every hour
// Combines orders (from webhooks) with ad spend to compute ROAS, MER, NCPA, etc.
crons.interval(
  "calculate-metrics",
  { hours: 1 },
  internal.sync.calculateDailyMetrics
);

// Sync orders from Salla every 15 minutes (backup for webhooks)
// Primary order data comes via webhooks, this ensures no orders are missed
crons.interval(
  "sync-orders",
  { minutes: 15 },
  internal.sync.syncAllOrders
);

export default crons;
