# Deploy Stripe Edge Functions to Supabase (run from repo root in PowerShell)
# Prerequisites: Node.js, Stripe + Supabase secrets set in dashboard

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Deploying Stripe functions to project ozuaijxdifqnbuavuelm ..." -ForegroundColor Cyan

npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref ozuaijxdifqnbuavuelm

Write-Host "`nSet secrets in Supabase Dashboard -> Edge Functions -> Secrets if you have not:" -ForegroundColor Yellow
Write-Host "  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY"
Write-Host "  (optional) STRIPE_PRICE_WEEKLY/MONTHLY/YEARLY`n"

npx --yes supabase@latest functions deploy create-payment-sheet
npx --yes supabase@latest functions deploy create-checkout-session
npx --yes supabase@latest functions deploy verify-checkout-session
npx --yes supabase@latest functions deploy create-billing-portal
npx --yes supabase@latest functions deploy stripe-webhook --no-verify-jwt

Write-Host "`nDone. Test:" -ForegroundColor Green
Write-Host "  https://ozuaijxdifqnbuavuelm.supabase.co/functions/v1/create-checkout-session"
Write-Host "  (OPTIONS should return 200, not 404)`n"
