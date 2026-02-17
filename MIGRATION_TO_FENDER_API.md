# Migration to Fender-AI Centralized API

## Summary

This dealer website has been successfully migrated from a **standalone system** to a **client of the centralized Fender-AI API**. The website now fetches inventory data and submits customer forms through the external Fender-AI platform.

## What Changed

### ✅ Updated Files

#### 1. `.env` - Environment Configuration
**Before:**
```bash
VITE_SUPABASE_URL=https://apaaabypiufsboprsqvn.supabase.co
VITE_SUPABASE_ANON_KEY=[key]
VITE_FENDER_API_KEY=trinity_21a707ff429f42afff343c701b575e54
```

**After:**
```bash
# Local Supabase (for dealer_info table only)
VITE_SUPABASE_URL=https://apaaabypiufsboprsqvn.supabase.co
VITE_SUPABASE_ANON_KEY=[key]

# Fender-AI Centralized API (for inventory and forms)
VITE_FENDER_API_URL=https://bybapmqqxfdygyrowzth.supabase.co
VITE_FENDER_API_KEY=trinity_21a707ff429f42afff343c701b575e54
```

**Changes:**
- Added `VITE_FENDER_API_URL` pointing to centralized Fender-AI system
- Added comments explaining each variable's purpose
- Separated local vs. external API configuration

#### 2. `src/lib/fenderApi.ts` - API Client
**Major Refactoring:**

| Method | Before | After |
|--------|--------|-------|
| `getInventory()` | Direct Supabase query to local `vehicles` table | HTTP GET to Fender-AI `/public-inventory` endpoint |
| `getVehicle()` | Direct Supabase query to local `vehicles` table | HTTP GET to Fender-AI `/public-vehicle/{id}` endpoint |
| `submitForm()` | Used `VITE_SUPABASE_URL` (local instance) | Uses `VITE_FENDER_API_URL` (external API) |
| `getDealer()` | ✅ Unchanged - still reads local `dealer_info` | ✅ Unchanged - still reads local `dealer_info` |

**New Helper Methods:**
```typescript
private getFenderApiUrl(): string
private getFenderApiKey(): string
```

**Benefits:**
- Centralized configuration validation
- Clear error messages
- Consistent API authentication
- All external calls use correct Fender-AI URL

#### 3. `src/vite-env.d.ts` - TypeScript Definitions
**Added:**
```typescript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FENDER_API_URL: string      // NEW
  readonly VITE_FENDER_API_KEY: string
}
```

**Benefits:**
- Full TypeScript type safety
- IDE autocomplete for environment variables
- Compile-time validation

### 📄 New Documentation

#### 1. `DEALER_WEBSITE_ARCHITECTURE.md`
Comprehensive guide covering:
- System architecture diagram
- Environment variable configuration
- API integration details
- Data flow explanations
- Troubleshooting guide

#### 2. `MIGRATION_TO_FENDER_API.md` (this file)
Migration summary and changes overview.

## Architecture Comparison

### Before: Standalone System
```
┌──────────────────────────────┐
│   Dealer Website             │
│                              │
│   ┌────────────────────┐     │
│   │ React Components   │     │
│   └─────────┬──────────┘     │
│             │                │
│   ┌─────────▼──────────┐     │
│   │ Supabase Client    │     │
│   └─────────┬──────────┘     │
│             │                │
│   ┌─────────▼──────────┐     │
│   │ Local Database     │     │
│   │ • vehicles         │     │
│   │ • leads            │     │
│   │ • dealer_info      │     │
│   └────────────────────┘     │
│                              │
│   ┌────────────────────┐     │
│   │ Local Edge Funcs   │     │
│   │ • public-inventory │     │
│   │ • public-vehicle   │     │
│   │ • public-submit    │     │
│   └────────────────────┘     │
└──────────────────────────────┘
```

**Problems:**
- Each dealer maintains separate inventory database
- No single source of truth
- Complex synchronization required
- Duplicate edge functions on every dealer site

### After: API Client Architecture
```
┌──────────────────────────────┐
│   Dealer Website             │
│                              │
│   ┌────────────────────┐     │
│   │ React Components   │     │
│   └─────────┬──────────┘     │
│             │                │
│   ┌─────────▼──────────┐     │
│   │ Fender API Client  │     │
│   │ (HTTP Fetch)       │     │
│   └─────────┬──────────┘     │
│             │                │
│   ┌─────────▼──────────┐     │
│   │ Local DB (minimal) │     │
│   │ • dealer_info only │     │
│   └────────────────────┘     │
└─────────────┬────────────────┘
              │
              │ HTTP + API Key
              │
┌─────────────▼────────────────┐
│   FENDER-AI SYSTEM           │
│   (Centralized)              │
│                              │
│   ┌────────────────────┐     │
│   │ Edge Functions     │     │
│   │ • public-inventory │     │
│   │ • public-vehicle   │     │
│   │ • public-submit    │     │
│   └─────────┬──────────┘     │
│             │                │
│   ┌─────────▼──────────┐     │
│   │ Central Database   │     │
│   │ • vehicles         │     │
│   │ • submissions      │     │
│   │ • api_keys         │     │
│   │ • api_logs         │     │
│   └────────────────────┘     │
└──────────────────────────────┘
```

**Benefits:**
- Single source of truth for inventory
- Centralized lead management
- Simplified dealer setup
- Real-time inventory updates
- Consistent API across all dealers
- Rate limiting and monitoring

## What Stays Local

Only dealer-specific branding and configuration:

| Table | Purpose | Example Data |
|-------|---------|--------------|
| `dealer_info` | Dealer branding | Name, phone, address, logo, theme colors |

**Everything else** (inventory, leads, forms) is now managed through Fender-AI API.

## What Was Removed

The following local components are **no longer needed**:

### Database Tables (not used anymore)
- ❌ `vehicles` - Inventory from API
- ❌ `leads` - Submissions via API
- ❌ `finance_applications` - Submissions via API
- ❌ `trade_ins` - Submissions via API

**Note:** These tables still exist in the database but are not queried. They can be removed in a future cleanup.

### Edge Functions (removed)
- ❌ `/supabase/functions/public-inventory/`
- ❌ `/supabase/functions/public-vehicle/`
- ❌ `/supabase/functions/public-submit-form/`
- ❌ `/supabase/functions/public-dealer/`

**Reason:** These now live in the centralized Fender-AI system. Dealer websites don't need to host their own Edge Functions.

## API Integration Details

### Inventory Fetching

**Old Way:**
```typescript
const { data, error } = await supabase
  .from('vehicles')
  .select('*')
  .eq('is_active', true);
```

**New Way:**
```typescript
const response = await fetch(
  `${FENDER_API_URL}/functions/v1/public-inventory`,
  {
    headers: {
      'X-Fender-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  }
);
const { vehicles, pagination } = await response.json();
```

### Form Submission

**Old Way:**
```typescript
const { data, error } = await supabase
  .from('leads')
  .insert({
    first_name,
    last_name,
    email,
    phone,
    message,
  });
```

**New Way:**
```typescript
const response = await fetch(
  `${FENDER_API_URL}/functions/v1/public-submit-form`,
  {
    method: 'POST',
    headers: {
      'X-Fender-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'lead',
      first_name,
      last_name,
      email,
      phone,
      message,
    }),
  }
);
const result = await response.json();
```

## Testing Checklist

### ✅ Completed
- [x] Environment variables configured
- [x] API client refactored
- [x] TypeScript types updated
- [x] Build successful
- [x] Documentation created

### 🧪 To Test

Before deploying to production, verify:

1. **Inventory Display**
   - [ ] Homepage shows featured vehicles
   - [ ] Inventory page displays vehicles with filters
   - [ ] Pagination works correctly
   - [ ] Search functionality works
   - [ ] Price/year filters work

2. **Vehicle Details**
   - [ ] Individual vehicle pages load
   - [ ] Photos display correctly
   - [ ] Features and specifications show
   - [ ] CARFAX integration works

3. **Forms Submission**
   - [ ] Contact form submits successfully
   - [ ] Vehicle inquiry form works
   - [ ] Financing application submits
   - [ ] Trade-in form submits
   - [ ] Success messages display

4. **Error Handling**
   - [ ] Network errors show user-friendly messages
   - [ ] Invalid vehicle IDs show 404 error
   - [ ] Form validation errors display correctly

5. **Performance**
   - [ ] Initial page load is fast
   - [ ] Inventory loads within 2 seconds
   - [ ] Images load progressively
   - [ ] No console errors

## Deployment

### Pre-Deployment
1. Update `.env` file with production values
2. Verify `VITE_FENDER_API_URL` is correct
3. Confirm API key is valid and active
4. Test all functionality in staging

### Deployment Steps
```bash
# Build production bundle
npm run build

# Test production build locally
npm run preview

# Deploy dist/ folder to hosting
# (Netlify, Vercel, etc.)
```

### Post-Deployment
1. Verify inventory displays correctly
2. Test form submissions
3. Check browser console for errors
4. Monitor Fender-AI API logs for requests

## Rollback Plan

If issues occur, you can temporarily revert:

1. **Restore old `.env`:**
   ```bash
   git checkout HEAD~1 -- .env
   ```

2. **Restore old `fenderApi.ts`:**
   ```bash
   git checkout HEAD~1 -- src/lib/fenderApi.ts
   ```

3. **Rebuild and redeploy:**
   ```bash
   npm run build
   # Deploy dist/
   ```

**Note:** This only works if local `vehicles` table still has data.

## Support

### Common Issues

| Issue | Solution |
|-------|----------|
| "VITE_FENDER_API_URL is not configured" | Add variable to `.env` and restart dev server |
| "Failed to fetch inventory" | Check API key is valid and Fender-AI system is online |
| CORS errors | Contact Fender-AI support to whitelist your domain |
| Vehicle not found | Verify vehicle exists in Fender-AI inventory |

### Getting Help
- Review `DEALER_WEBSITE_ARCHITECTURE.md`
- Check browser console for detailed errors
- Review Fender-AI API logs in admin panel
- Contact Fender-AI support team

## Next Steps

1. **Test Thoroughly**: Run through all pages and forms
2. **Update Staging**: Deploy to staging environment first
3. **Monitor API Usage**: Check request logs in Fender-AI admin
4. **Production Deploy**: After successful staging test
5. **Clean Up**: Remove unused database tables and functions (optional)

## Benefits Achieved

✅ **Single Source of Truth**
- Inventory managed centrally
- No synchronization issues

✅ **Simplified Architecture**
- Less code to maintain
- No duplicate Edge Functions
- Minimal local database

✅ **Better Security**
- API key authentication
- Rate limiting built-in
- Request logging

✅ **Real-Time Updates**
- Inventory changes reflect immediately
- No sync delays

✅ **Easier Scaling**
- Add new dealers without infrastructure
- Centralized updates benefit all dealers
- Consistent features across all sites
