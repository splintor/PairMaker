#!/usr/bin/env bash
# Push the production environment variables from .env to Vercel.
# Prereqs: `vercel login` and `vercel link` already done in this directory.
# Usage: bash scripts/push-vercel-env.sh
set -euo pipefail

KEYS="DATABASE_URL AUTH_SECRET AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET AUTH_RESEND_KEY EMAIL_FROM COMMUNITY_INVITE_CODE"

for K in $KEYS; do
  V=$(grep -E "^$K=" .env | head -1 | sed -E "s/^$K=//; s/^\"//; s/\"$//")
  if [ -z "$V" ]; then
    echo "skip $K (not set in .env)"
    continue
  fi
  echo "→ $K"
  printf "%s" "$V" | vercel env add "$K" production
done

echo "Done. NEXTAUTH_URL is intentionally NOT pushed (it's localhost)."
echo "Auth.js v5 auto-trusts the Vercel host; set AUTH_URL only if you use a custom domain."
