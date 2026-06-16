#!/bin/bash

# Ensure execution halts on any intermediate failures
set -e

echo "============================================================"
echo "          Aura AI Storefront Verification Suite             "
echo "============================================================"

echo ""
echo "Step 1: Running Semantic Vector Search Infrastructure Tests"
echo "------------------------------------------------------------"
npx tsx src/tests/semantic-search.test.ts

echo ""
echo "Step 2: Running AI Support Concierge Persona & Safety Tests"
echo "------------------------------------------------------------"
npx tsx src/tests/ai-concierge.test.ts

echo ""
echo "============================================================"
echo "🟢 All test suites verified successfully!"
echo "============================================================"
