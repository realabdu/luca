/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as campaigns from "../campaigns.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardSync from "../dashboardSync.js";
import type * as events from "../events.js";
import type * as integrations from "../integrations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as oauthStates from "../oauthStates.js";
import type * as onboarding from "../onboarding.js";
import type * as organizations from "../organizations.js";
import type * as pixelEvents from "../pixelEvents.js";
import type * as seed from "../seed.js";
import type * as sync from "../sync.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  campaigns: typeof campaigns;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dashboardSync: typeof dashboardSync;
  events: typeof events;
  integrations: typeof integrations;
  "lib/auth": typeof lib_auth;
  "lib/encryption": typeof lib_encryption;
  oauthStates: typeof oauthStates;
  onboarding: typeof onboarding;
  organizations: typeof organizations;
  pixelEvents: typeof pixelEvents;
  seed: typeof seed;
  sync: typeof sync;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
