# Uptown Auto Sales Website

## 🚗 Standalone Dealer Website

**Status**: Ready for deployment (Fender-AI integration pending)

**Theme**: Patriotic Red, White & Blue

---

## 📁 Project Structure

```
UptownAutoSales_Website/
├── src/
│   ├── components/     # Navigation, Footer, etc.
│   ├── pages/          # Home, About, Inventory, etc.
│   ├── lib/
│   │   ├── fenderApi.ts    # Fender-AI API client
│   │   ├── mockData.ts     # Mock data for standalone mode
│   │   └── apiHooks.ts     # React hooks with mock support
│   └── contexts/       # DealerContext, AuthContext
├── public/             # Static assets
└── .env.local          # Environment variables
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd UptownAutoSales_Website
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### 3. Build for Production
```bash
npm run build
```

---

## 📋 Deployment Options

### Option A: Cloudflare Pages (Recommended)
```bash
# Install wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy dist --project-name=uptown-auto-sales
```

### Option B: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option C: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

---

## 🎨 Customization

### Change Colors
Edit `src/index.css`:
```css
:root {
  --dealer-primary-color: #dc2626;    /* Red */
  --dealer-secondary-color: #1e40af;  /* Blue */
}
```

### Add Logo
1. Place logo file in `/public/logo.png`
2. Update will happen automatically

### Update Content
Edit these files:
- `src/pages/Home.tsx` - Homepage content
- `src/pages/About.tsx` - About page content
- `src/components/Footer.tsx` - Footer info

### Update Mock Inventory
Edit `src/lib/mockData.ts`:
```typescript
export const mockVehicles: FenderVehicle[] = [
  // Add your vehicles here
];
```

---

## 🔌 Fender-AI Integration (Future)

When ready to connect to Fender-AI:

1. **Get API Key** from Fender-AI Admin Panel
2. **Update `.env.local`**:
```bash
# Remove this:
VITE_USE_MOCK_DATA=true

# Add this:
VITE_FENDER_API_URL=https://bybapmqqxfdygyrowzth.supabase.co
VITE_FENDER_API_KEY=fdr_[YOUR_API_KEY]
```

3. **Rebuild & Redeploy**

The site will automatically switch from mock data to live Fender-AI inventory.

---

## 📞 Dealer Info

- **Name**: Uptown Auto Sales
- **Phone**: 706-295-9700
- **Location**: Rome, GA 30161
- **Hours**: Mon-Sat: 9AM-7PM, Sun: Closed

---

## ✅ Features Included

- ✅ Light theme with patriotic colors
- ✅ Mobile responsive
- ✅ Hero section with CTA
- ✅ Featured inventory display
- ✅ About page with company info
- ✅ Contact form
- ✅ Financing page
- ✅ Trade-in page
- ✅ Vehicle detail pages
- ✅ Mock data for standalone operation

---

## 🛠️ Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide Icons

---

## 📄 License

Private - For Uptown Auto Sales use only
