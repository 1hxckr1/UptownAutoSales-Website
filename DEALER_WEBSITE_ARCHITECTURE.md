# Dealer Website Architecture

This dealer website is configured as a **client of the centralized Fender-AI API** system. It fetches inventory data and submits customer forms to the external Fender-AI platform.

## Architecture Overview

```
┌─────────────────────────────────┐
│   Trinity Dealer Website        │
│   (This Project)                │
│                                 │
│   • Display inventory           │
│   • Submit customer forms       │
│   • Local dealer branding       │
└────────────┬────────────────────┘
             │
             │ HTTP Requests
             │ (with API Key)
             ▼
┌─────────────────────────────────┐
│   FENDER-AI SYSTEM              │
│   (Centralized Platform)        │
│                                 │
│   Edge Functions:               │
│   • /public-inventory           │
│   • /public-vehicle/{id}        │
│   • /public-submit-form         │
│                                 │
│   Database:                     │
│   • vehicles table              │
│   • customer_submissions        │
│   • api_request_logs            │
└─────────────────────────────────┘
```

## Environment Variables

### Required Configuration

Create a `.env` file in the project root:

```bash
# Local Supabase (for dealer_info table only)
VITE_SUPABASE_URL=https://[your-dealer-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-dealer-anon-key]

# Fender-AI Centralized API (for inventory and forms)
VITE_FENDER_API_URL=https://bybapmqqxfdygyrowzth.supabase.co
VITE_FENDER_API_KEY=trinity_21a707ff429f42afff343c701b575e54
```

### Variable Usage

| Variable | Purpose | Used For |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Local dealer database | Reading dealer branding info from `dealer_info` table |
| `VITE_SUPABASE_ANON_KEY` | Local database auth | Accessing local `dealer_info` table |
| `VITE_FENDER_API_URL` | External API endpoint | **All inventory and form submissions** |
| `VITE_FENDER_API_KEY` | API authentication | Authenticating requests to Fender-AI |

## API Integration

### API Client (`src/lib/fenderApi.ts`)

The `TrinityApiClient` class handles all API communication:

#### 1. Get Dealer Information (Local)
```typescript
getDealer(): Promise<FenderDealer>
```
- Reads from **local** `dealer_info` table
- Contains dealer branding, contact info, theme colors
- Cached in localStorage for 24 hours

#### 2. Get Inventory (External API)
```typescript
getInventory(params?: InventoryParams): Promise<InventoryResponse>
```
- **Calls Fender-AI API**: `GET /functions/v1/public-inventory`
- Supports filtering, sorting, pagination
- Returns vehicles from centralized inventory

#### 3. Get Single Vehicle (External API)
```typescript
getVehicle(vehicleId: string): Promise<FenderVehicle>
```
- **Calls Fender-AI API**: `GET /functions/v1/public-vehicle/{vehicleId}`
- Returns detailed vehicle information
- Includes photos, features, CARFAX data

#### 4. Submit Form (External API)
```typescript
submitForm(submission: FormSubmission): Promise<FormSubmissionResponse>
```
- **Calls Fender-AI API**: `POST /functions/v1/public-submit-form`
- Handles contact, lead, financing, trade-in forms
- All customer data stored in Fender-AI system

## Authentication

All API requests to Fender-AI include:

```http
X-Fender-API-Key: trinity_21a707ff429f42afff343c701b575e54
Content-Type: application/json
```

The API key:
- Identifies this dealer
- Enforces rate limiting (60 requests/minute default)
- Tracks usage in `api_request_logs`
- Can be managed via Fender-AI Admin panel

## Data Flow

### Inventory Display Flow

1. User visits inventory page
2. React component calls `useInventory()` hook
3. Hook calls `fenderApi.getInventory()`
4. API client makes HTTP GET to Fender-AI
5. Response contains vehicles and pagination
6. UI displays inventory from centralized system

### Form Submission Flow

1. User fills out contact/inquiry form
2. Form calls `fenderApi.submitForm()`
3. API client makes HTTP POST to Fender-AI
4. Fender-AI validates and stores submission
5. Response confirms success
6. UI shows confirmation message

## Local Database

The dealer website maintains a minimal local database for:

### `dealer_info` Table
Stores dealer-specific configuration:
- Business name and contact information
- Address and location
- Theme colors and branding
- Logo URL
- Website settings

**Note**: The `vehicles`, `leads`, and other tables from the original schema are **not used**. All vehicle and customer data lives in the centralized Fender-AI system.

## Removed Components

The following have been **removed** from dealer websites:

- ❌ Local `vehicles` table queries
- ❌ Local Edge Functions:
  - `public-inventory`
  - `public-vehicle`
  - `public-submit-form`
  - `public-dealer`
- ❌ Inventory sync functionality
- ❌ Direct database writes for leads/submissions

These are **centralized in Fender-AI** and accessed via API.

## Benefits of This Architecture

1. **Single Source of Truth**
   - Inventory managed centrally
   - Real-time updates across all dealer touchpoints

2. **Simplified Dealer Setup**
   - No complex database setup
   - Just add API key and dealer info
   - Automatic inventory synchronization

3. **Centralized Lead Management**
   - All customer inquiries in one system
   - Easy to route and track leads
   - Consistent data structure

4. **Security & Rate Limiting**
   - API keys prevent unauthorized access
   - Rate limiting protects system resources
   - Request logging for monitoring

5. **Easy Updates**
   - Inventory changes reflect immediately
   - No need to sync databases
   - Consistent feature availability

## Development

### Running Locally

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Output is in `dist/` directory.

### Type Checking

```bash
npm run typecheck
```

## API Endpoints Reference

### Base URL
```
https://bybapmqqxfdygyrowzth.supabase.co/functions/v1
```

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public-inventory` | GET | List vehicles with filters |
| `/public-vehicle/{id}` | GET | Get single vehicle details |
| `/public-submit-form` | POST | Submit customer forms |

### Example API Call

```javascript
const response = await fetch(
  'https://bybapmqqxfdygyrowzth.supabase.co/functions/v1/public-inventory?limit=20&sort=newest',
  {
    headers: {
      'X-Fender-API-Key': 'trinity_21a707ff429f42afff343c701b575e54',
      'Content-Type': 'application/json',
    },
  }
);

const { vehicles, pagination } = await response.json();
```

## Troubleshooting

### "API configuration is missing"
- Verify `.env` file exists
- Check `VITE_FENDER_API_URL` and `VITE_FENDER_API_KEY` are set
- Restart dev server after changing `.env`

### "Failed to fetch inventory"
- Check API key is valid
- Verify Fender-AI system is online
- Check network connectivity
- Review browser console for details

### "Vehicle not found"
- Vehicle may have been removed from inventory
- Check vehicle ID is correct
- Verify vehicle is active in Fender-AI system

### CORS Errors
- Fender-AI Edge Functions must allow dealer domain
- Check API key is authorized for this domain
- Contact Fender-AI support to whitelist domain

## Support

For API issues, configuration, or new dealer setup:
- Contact Fender-AI support
- Review API documentation
- Check `api_request_logs` in Fender-AI admin panel
