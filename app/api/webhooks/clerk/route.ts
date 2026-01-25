import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new NextResponse("Missing webhook secret", { status: 500 });
  }

  if (!client) {
    console.error("Missing NEXT_PUBLIC_CONVEX_URL");
    return new NextResponse("Missing Convex URL", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  try {
    switch (eventType) {
      // User events
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.find((e) => e.id === evt.data.primary_email_address_id);

        await client.mutation(api.users.upsertFromClerk, {
          clerkId: id,
          email: primaryEmail?.email_address || "",
          name: [first_name, last_name].filter(Boolean).join(" ") || undefined,
          avatarUrl: image_url || undefined,
        });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await client.mutation(api.users.deleteByClerkId, {
            clerkId: id,
          });
        }
        break;
      }

      // Organization events
      case "organization.created": {
        const { id, name, slug, created_by } = evt.data;
        await client.mutation(api.organizations.createFromClerk, {
          clerkOrgId: id,
          name: name,
          slug: slug,
          createdByClerkId: created_by,
        });
        break;
      }

      case "organization.updated": {
        const { id, name, slug } = evt.data;
        await client.mutation(api.organizations.updateFromClerk, {
          clerkOrgId: id,
          name: name,
          slug: slug,
        });
        break;
      }

      case "organization.deleted": {
        const { id } = evt.data;
        if (id) {
          await client.mutation(api.organizations.deleteFromClerk, {
            clerkOrgId: id,
          });
        }
        break;
      }

      // Membership events
      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;
        await client.mutation(api.organizations.createMembership, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
          role: mapClerkRoleToRole(role),
        });
        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;
        await client.mutation(api.organizations.updateMembership, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
          role: mapClerkRoleToRole(role),
        });
        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;
        await client.mutation(api.organizations.deleteMembership, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
        });
        break;
      }

      default:
        console.log(`Unhandled Clerk webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (error) {
    console.error(`Error processing Clerk webhook ${eventType}:`, error);
    return new NextResponse(
      `Error processing webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

/**
 * Map Clerk role to our internal role
 */
function mapClerkRoleToRole(clerkRole: string): "admin" | "member" {
  // Clerk roles: org:admin, org:member (or custom roles)
  if (clerkRole === "org:admin" || clerkRole === "admin") {
    return "admin";
  }
  return "member";
}

export async function GET() {
  return NextResponse.json({ status: "Clerk webhook endpoint active" });
}
