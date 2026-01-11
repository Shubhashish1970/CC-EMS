#!/bin/bash

# Quick test script that works with just FFA_API_URL value
# Usage: ./scripts/quick-test-ffa.sh [FFA_API_URL]

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/quick-test-ffa.sh <FFA_API_URL>"
    echo ""
    echo "Example:"
    echo "  ./scripts/quick-test-ffa.sh https://mock-ffa-api-xxxxx.run.app/api"
    echo ""
    echo "Or set it as environment variable:"
    echo "  export FFA_API_URL=https://mock-ffa-api-xxxxx.run.app/api"
    echo "  ./scripts/quick-test-ffa.sh"
    exit 1
fi

FFA_API_URL=${1:-$FFA_API_URL}

# Remove trailing slash if present
FFA_API_URL=$(echo "$FFA_API_URL" | sed 's:/*$::')

echo "🔍 Testing FFA API Configuration"
echo "================================"
echo ""
echo "FFA_API_URL: $FFA_API_URL"
echo ""

# Test health endpoint
HEALTH_URL="${FFA_API_URL}/health"
echo "1️⃣  Testing health endpoint: $HEALTH_URL"
HEALTH_RESPONSE=$(curl -s --max-time 10 "$HEALTH_URL" 2>&1) || HEALTH_RESPONSE="ERROR"
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>&1) || HTTP_STATUS="ERROR"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health endpoint working (HTTP 200)"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null | head -8 || echo "$HEALTH_RESPONSE" | head -3
elif [ "$HTTP_STATUS" = "404" ]; then
    echo "❌ 404 Not Found - Health endpoint doesn't exist"
    echo "   This suggests the service URL is wrong or service doesn't exist"
else
    echo "❌ Request failed (HTTP $HTTP_STATUS)"
    echo "   Response: $HEALTH_RESPONSE" | head -3
fi
echo ""

# Test activities endpoint
ACTIVITIES_URL="${FFA_API_URL}/activities?limit=2"
echo "2️⃣  Testing activities endpoint: $ACTIVITIES_URL"
ACTIVITIES_RESPONSE=$(curl -s --max-time 10 "$ACTIVITIES_URL" 2>&1) || ACTIVITIES_RESPONSE="ERROR"
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$ACTIVITIES_URL" 2>&1) || HTTP_STATUS="ERROR"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Activities endpoint working (HTTP 200)"
    if echo "$ACTIVITIES_RESPONSE" | grep -q '"success"'; then
        ACTIVITIES_COUNT=$(echo "$ACTIVITIES_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('data', {}).get('activities', [])))" 2>/dev/null || echo "0")
        echo "   Found $ACTIVITIES_COUNT activities"
        echo "$ACTIVITIES_RESPONSE" | python3 -m json.tool 2>/dev/null | head -15 || echo "$ACTIVITIES_RESPONSE" | head -5
    else
        echo "   Response: $ACTIVITIES_RESPONSE" | head -5
    fi
elif [ "$HTTP_STATUS" = "404" ]; then
    echo "❌ 404 Not Found - Activities endpoint doesn't exist"
    echo "   This is the error causing FFA sync to fail!"
    echo ""
    echo "💡 Possible causes:"
    echo "   1. Mock FFA API service is not deployed"
    echo "   2. FFA_API_URL is pointing to wrong URL"
    echo "   3. Service exists but endpoint path is wrong"
else
    echo "❌ Request failed (HTTP $HTTP_STATUS)"
    echo "   Response: $ACTIVITIES_RESPONSE" | head -5
fi
echo ""

# Summary
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ All tests passed! FFA_API_URL is correctly configured."
else
    echo "❌ Tests failed. FFA sync will not work until this is fixed."
    echo ""
    echo "💡 Next steps:"
    echo "   1. Deploy Mock FFA API via GitHub Actions"
    echo "   2. Update FFA_API_URL to point to Mock FFA API URL"
    echo "   3. Redeploy backend"
fi
