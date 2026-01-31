"""Management command to sync users and organizations from Clerk."""

import httpx
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.accounts.models import User, Organization, Membership


class Command(BaseCommand):
    help = "Sync users and organizations from Clerk"

    def handle(self, *args, **options):
        secret_key = settings.CLERK_SECRET_KEY
        if not secret_key:
            self.stderr.write("CLERK_SECRET_KEY not configured")
            return

        headers = {"Authorization": f"Bearer {secret_key}"}
        base_url = "https://api.clerk.com/v1"

        # Sync organizations
        self.stdout.write("Syncing organizations...")
        try:
            resp = httpx.get(f"{base_url}/organizations", headers=headers, timeout=30)
            resp.raise_for_status()
            orgs_response = resp.json()
            # Handle both list and dict with "data" key
            orgs = orgs_response.get("data", orgs_response) if isinstance(orgs_response, dict) else orgs_response

            for org_data in orgs:
                org, created = Organization.objects.update_or_create(
                    clerk_org_id=org_data["id"],
                    defaults={
                        "name": org_data.get("name", ""),
                        "slug": org_data.get("slug", org_data["id"]),
                    },
                )
                action = "Created" if created else "Updated"
                self.stdout.write(f"  {action} org: {org.name} ({org.clerk_org_id})")
        except Exception as e:
            self.stderr.write(f"Failed to sync organizations: {e}")

        # Sync users
        self.stdout.write("Syncing users...")
        try:
            resp = httpx.get(f"{base_url}/users", headers=headers, timeout=30)
            resp.raise_for_status()
            users_response = resp.json()
            # Handle both list and dict with "data" key
            users = users_response.get("data", users_response) if isinstance(users_response, dict) else users_response

            for user_data in users:
                emails = user_data.get("email_addresses", [])
                email = emails[0]["email_address"] if emails else f"{user_data['id']}@clerk.temp"
                first_name = user_data.get("first_name") or ""
                last_name = user_data.get("last_name") or ""
                name = f"{first_name} {last_name}".strip()

                user, created = User.objects.update_or_create(
                    clerk_id=user_data["id"],
                    defaults={
                        "email": email,
                        "name": name,
                        "avatar_url": user_data.get("image_url", ""),
                    },
                )
                action = "Created" if created else "Updated"
                self.stdout.write(f"  {action} user: {user.email}")
        except Exception as e:
            self.stderr.write(f"Failed to sync users: {e}")

        # Sync memberships
        self.stdout.write("Syncing memberships...")
        for org in Organization.objects.filter(clerk_org_id__isnull=False):
            try:
                resp = httpx.get(
                    f"{base_url}/organizations/{org.clerk_org_id}/memberships",
                    headers=headers,
                    timeout=30,
                )
                resp.raise_for_status()
                mem_response = resp.json()
                memberships = mem_response.get("data", mem_response) if isinstance(mem_response, dict) else mem_response

                for mem_data in memberships:
                    user_id = mem_data.get("public_user_data", {}).get("user_id")
                    role = mem_data.get("role", "member")

                    try:
                        user = User.objects.get(clerk_id=user_id)
                        membership, created = Membership.objects.update_or_create(
                            user=user,
                            organization=org,
                            defaults={"role": "admin" if role == "admin" else "member"},
                        )
                        action = "Created" if created else "Updated"
                        self.stdout.write(f"  {action} membership: {user.email} -> {org.name}")
                    except User.DoesNotExist:
                        self.stderr.write(f"  User not found: {user_id}")
            except Exception as e:
                self.stderr.write(f"Failed to sync memberships for {org.name}: {e}")

        self.stdout.write(self.style.SUCCESS("Sync complete!"))
