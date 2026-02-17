# Quick Start Guide - Trinity Dealer Website

## 🚀 Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file in project root:

```bash
# Local Supabase (for dealer branding)
VITE_SUPABASE_URL=https://apaaabypiufsboprsqvn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYWFhYnlwaXVmc2JvcHJzcXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDEyOTIsImV4cCI6MjA4NTIxNzI5Mn0.4PCEYLSxmvEID4OqPdn55iXJZwALEv7RCTO0-4YXMSA

# Fender-AI Centralized API
VITE_FENDER_API_URL=https://bybapmqqxfdygyrowzth.supabase.co
VITE_FENDER_API_KEY=trinity_21a707ff429f42afff343c701b575e54
```

### 3. Run Development Server
```bash
npm run dev
```

Visit: `http://localhost:5173`

## 🏗️ Architecture

This is a **dealer client website** that connects to the **centralized Fender-AI API**.

```
Dealer Website → Fender-AI API → Central Database
```

### What's Local
- Dealer branding (`dealer_info` table)
- Website theme and styling

### What's Remote (API)
- Vehicle inventory
- Customer form submissions
- Lead management

## 📡 API Endpoints

**Base URL:** `https://bybapmqqxfdygyrowzth.supabase.co/functions/v1/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public-inventory` | GET | List vehicles |
| `/public-vehicle/{id}` | GET | Single vehicle |
| `/public-submit-form` | POST | Submit forms |

**Authentication:**
```http
X-Fender-API-Key: trinity_21a707ff429f42afff343c701b575e54
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/fenderApi.ts` | API client (inventory, forms) |
| `src/lib/supabase.ts` | Local database (dealer info) |
| `src/lib/apiHooks.ts` | React hooks for data fetching |
| `.env` | Environment configuration |

## 🛠️ Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run typecheck    # Check TypeScript types

# Linting
npm run lint         # Run ESLint
```

## 🧪 Testing Checklist

Before deploying:

- [ ] Inventory page loads
- [ ] Vehicle details display
- [ ] Contact form submits
- [ ] Inquiry form submits
- [ ] Financing form submits
- [ ] Trade-in form submits
- [ ] No console errors

## 🐛 Troubleshooting

### "API configuration is missing"
→ Check `.env` file exists and has all variables

### "Failed to fetch inventory"
→ Verify Fender-AI API is online and key is valid

### CORS errors
→ Domain needs to be whitelisted in Fender-AI

### Blank pages
→ Check browser console for JavaScript errors

## 📚 Documentation

- `DEALER_WEBSITE_ARCHITECTURE.md` - Full architecture guide
- `MIGRATION_TO_FENDER_API.md` - Migration details
- `QUICK_START.md` - This file

## 🔑 API Key Management

Current API Key: `trinity_21a707ff429f42afff343c701b575e54`

**To generate new key:**
1. Login to Fender-AI admin panel
2. Go to Dealer Management
3. Generate new API key
4. Update `.env` file
5. Restart dev server

## 📊 Monitoring

View API usage:
1. Login to Fender-AI admin
2. Check API request logs
3. Monitor rate limits
4. Review error logs

## 🚢 Deployment

```bash
# 1. Build
npm run build

# 2. Test locally
npm run preview

# 3. Deploy dist/ folder
# (Use Netlify, Vercel, or your hosting provider)
```

## 💡 Development Tips

1. **Hot Reload**: Changes to React components reload automatically
2. **Type Safety**: Use TypeScript interfaces for API responses
3. **Error Handling**: All API calls include try/catch
4. **Caching**: Dealer info cached for 24 hours
5. **Performance**: Images lazy load, inventory paginated

## 🎨 Customization

### Update Dealer Info
1. Edit `dealer_info` table in local Supabase
2. Changes reflect after cache expires (24h) or clear localStorage

### Theme Colors
Update in `dealer_info.primary_color` column

### Logo
Update in `dealer_info.logo_url` column

## 📞 Support

**For API issues:**
- Check Fender-AI system status
- Review API request logs
- Contact Fender-AI support

**For website issues:**
- Check browser console
- Review error messages
- Check network tab for failed requests

---

**Ready to develop?** Run `npm run dev` and start coding!
