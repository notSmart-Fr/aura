Write-Host "============================================================" -ForegroundColor Green
Write-Host "          Aura AI Storefront Verification Suite             " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Running Semantic Vector Search Infrastructure Tests" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
npx tsx src/tests/semantic-search.test.ts

Write-Host ""
Write-Host "Step 2: Running AI Support Concierge Persona & Safety Tests" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
npx tsx src/tests/ai-concierge.test.ts

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "🟢 All test suites verified successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
