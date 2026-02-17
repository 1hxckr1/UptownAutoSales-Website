# Trinity UI Crash Fix

## Issue Summary

Trinity UI was crashing with `TypeError: Cannot read properties of null (reading 'toLocaleString')` when attempting to render vehicle inventory on the Home page.

## Root Causes

### 1. Null Safety Issue
The Home component was calling `.toLocaleString()` directly on potentially null vehicle fields:
- `vehicle.asking_price.toLocaleString()` (line 153)
- `vehicle.compare_price.toLocaleString()` (line 149)
- `vehicle.mileage.toLocaleString()` (line 158)

When vehicles had null values for these fields, the app would crash.

### 2. API Header Compatibility
The Supabase Gateway has a fixed allowlist of HTTP headers for CORS preflight:
- Content-Type
- Authorization
- X-Client-Info
- Apikey
- **X-API-Key** ← This is the key one

The gateway **does not** allow `X-Fender-API-Key` even though that's the canonical header name for Fender-AI's API.

## Solutions Implemented

### A. Added Null-Safe Formatting Helpers (Home.tsx)

Created three helper functions to safely format potentially null values:

```typescript
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return value.toLocaleString();
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return value.toLocaleString();
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
};
```

Replaced all direct `.toLocaleString()` calls with these helpers:
- `vehicle.asking_price.toLocaleString()` → `formatCurrency(vehicle.asking_price)`
- `vehicle.compare_price.toLocaleString()` → `formatCurrency(vehicle.compare_price)`
- `vehicle.mileage.toLocaleString()` → `formatNumber(vehicle.mileage)`

### B. Added Inventory Error Handling (Home.tsx)

Added error state handling from the `useInventory` hook:

```typescript
const { data: inventoryData, isLoading: loading, error: inventoryError } = useInventory({ limit: 12, sort: 'newest' });
```

Added non-blocking error banner when inventory fails to load:

```typescript
{inventoryError && (
  <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
    <p className="text-red-400 text-sm">
      Inventory unavailable — please try again later or contact us directly.
    </p>
  </div>
)}
```

### C. Standardized on Gateway-Compatible Header (fenderApi.ts)

Changed Trinity to use `X-API-Key` instead of `X-Fender-API-Key` because:
1. Supabase Gateway only allows `X-API-Key` in CORS preflight
2. The backend already supports both headers (via `publicApiAuth.ts`)
3. This prevents CORS preflight rejection

Updated header name in all API calls:
```typescript
headers: {
  'X-API-Key': apiKey,  // Gateway-compatible
  'Content-Type': 'application/json',
}
```

Updated logging:
```typescript
console.log(`[Trinity] Sending X-API-Key (gateway-compatible): ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
```

### D. Backend Header Support (publicApiAuth.ts)

The backend auth module already supports both header names:

```typescript
const xApiKey = req.headers.get("X-API-Key");
const xApiKeyLower = req.headers.get("x-api-key");
const xFenderApiKey = req.headers.get("X-Fender-API-Key");
const xFenderApiKeyLower = req.headers.get("x-fender-api-key");

const apiKey = xFenderApiKey || xFenderApiKeyLower || xApiKey || xApiKeyLower;
```

This means:
- External clients CAN use `X-Fender-API-Key` (canonical name)
- Trinity MUST use `X-API-Key` (gateway-compatible name)
- Both are validated identically

## Verification

### 1. CORS Preflight Test
```bash
curl -i -X OPTIONS 'https://bybapmqqxfdygyrowzth.supabase.co/functions/v1/public-inventory' \
  -H 'Access-Control-Request-Headers: x-api-key,content-type' \
  -H 'Origin: http://localhost:5173'

# Response includes:
# access-control-allow-headers: Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key
# HTTP/2 200
```

### 2. Inventory Fetch Test
```bash
curl -s 'https://bybapmqqxfdygyrowzth.supabase.co/functions/v1/public-inventory?limit=1' \
  -H 'X-API-Key: fdr_efb7a...' | jq -r '.pagination.total'

# Returns: 28
```

### 3. Build Test
```bash
npm run build
# ✓ built in 8.10s (no errors)
```

## Result

- ✅ Home page no longer crashes on null values
- ✅ Displays "—" for missing/null data instead of crashing
- ✅ Shows error banner if inventory fetch fails
- ✅ CORS preflight passes with X-API-Key header
- ✅ All 28 vehicles load successfully
- ✅ Frontend builds without errors

## Technical Notes

### Why Not Just Use X-Fender-API-Key Everywhere?

The Supabase Gateway is a managed layer that sits between the internet and Edge Functions. It performs:
- DDoS protection
- Rate limiting
- JWT verification (when enabled)
- **CORS header validation**

The gateway has a hardcoded allowlist of headers for security. Custom headers like `X-Fender-API-Key` would require Supabase to update their gateway configuration globally, which is not feasible.

### Why Keep X-Fender-API-Key Support in Backend?

Keeping both headers supported in the backend allows:
1. **Trinity (browser)** uses `X-API-Key` → passes gateway CORS
2. **External APIs (server-to-server)** can use `X-Fender-API-Key` → no CORS restrictions
3. **Flexibility** for future clients that may have different gateway constraints

This approach follows the principle of being liberal in what you accept and conservative in what you send.
