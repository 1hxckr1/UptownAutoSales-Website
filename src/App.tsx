import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DealerProvider } from './contexts/DealerContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import MobileCallButton from './components/MobileCallButton';
import { initAnalytics } from './lib/analytics';
import { usePageTracking } from './hooks/usePageTracking';

import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import VehicleDetails from './pages/VehicleDetails';
import VehicleInquiry from './pages/VehicleInquiry';
import Financing from './pages/Financing';
import TradeInPage from './pages/TradeIn';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/admin/Login';
import InventorySync from './pages/admin/InventorySync';
import CarfaxManagement from './pages/admin/CarfaxManagement';

function TrackedPublicLayout() {
  usePageTracking();

  return (
    <>
      <Navigation />
      <Outlet />
      <Footer />
      <MobileCallButton />
    </>
  );
}

function App() {
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const fenderApiBase = import.meta.env.VITE_FENDER_API_URL?.trim();
    const analyticsEndpointOverride = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
    const apiKey = import.meta.env.VITE_FENDER_API_KEY || import.meta.env.VITE_FENDER_AI_API_KEY;
    const enabled = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false';

    // Safe routing order (no API behavior changes):
    // 1) explicit override
    // 2) Fender API base (target destination for shared analytics)
    // 3) local Supabase fallback (legacy)
    const analyticsEndpoint =
      analyticsEndpointOverride && analyticsEndpointOverride.length > 0
        ? analyticsEndpointOverride
        : fenderApiBase && fenderApiBase.length > 0
          ? `${fenderApiBase.replace(/\/+$/, '')}/functions/v1/public-analytics-ingest`
          : supabaseUrl
            ? `${supabaseUrl}/functions/v1/public-analytics-ingest`
            : undefined;

    if (analyticsEndpoint && apiKey && enabled) {
      initAnalytics({
        endpoint: analyticsEndpoint,
        apiKey,
        enabled: true,
      });
      console.info('[Analytics] initialized endpoint:', analyticsEndpoint);
    } else {
      console.warn('[Analytics] disabled/misconfigured', {
        hasEndpoint: !!analyticsEndpoint,
        hasApiKey: !!apiKey,
        enabled,
      });
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <DealerProvider>
          <div className="min-h-screen bg-[#0a0f1e] text-white">
            <Routes>
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="inventory-sync" element={<InventorySync />} />
                <Route path="carfax-management" element={<CarfaxManagement />} />
              </Route>
              <Route element={<TrackedPublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/:slug" element={<VehicleDetails />} />
                <Route path="/inquiry" element={<VehicleInquiry />} />
                <Route path="/financing" element={<Financing />} />
                <Route path="/trade-in" element={<TradeInPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
              </Route>
            </Routes>
          </div>
        </DealerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
