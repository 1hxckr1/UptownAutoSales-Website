import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Shield, FileCheck, Heart, CheckCircle, ChevronRight } from 'lucide-react';
import { fenderApi } from '../lib/fenderApi';
import { useDealer } from '../contexts/DealerContext';
import { useInventory, usePreloadVehicles } from '../lib/apiHooks';
import { VehicleCardCarousel } from '../components/VehicleCardCarousel';
import Reviews from '../components/Reviews';
import { useAnalytics } from '../hooks/useAnalytics';

// Null-safe formatting helpers
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

export default function Home() {
  const [formData, setFormData] = useState({ name: '', phone: '', hp: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { dealer } = useDealer();
  const { ctaClick, leadSubmission } = useAnalytics();
  const { data: inventoryData, isLoading: loading, error: inventoryError } = useInventory({ limit: 12, sort: 'newest' });
  const preloadVehicles = usePreloadVehicles(inventoryData?.vehicles.slice(0, 6).map(v => v.id) || []);

  const featuredVehicles = (inventoryData?.vehicles || []).filter(
    v => v.primary_photo_url && v.primary_photo_url.length > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hp.trim().length > 0) return;
    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'lead',
        name: formData.name,
        phone: formData.phone,
        message: 'Contacted from homepage',
        hp: formData.hp,
      });

      leadSubmission('lead', true, { source: 'homepage' });
      setFormStatus('success');
      setFormData({ name: '', phone: '', hp: '' });
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (err) {
      leadSubmission('lead', false, { source: 'homepage' });
      setFormStatus('error');
      console.error('Failed to submit form:', err);
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="relative h-[600px] flex items-center">
          {/* American flag inspired background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient: red → white → blue */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-white to-blue-800" />

            {/* Soft color wash to unify and tone down the white center */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 via-slate-100/10 to-blue-900/70" />

            {/* Stars texture — subtle SVG pattern at low opacity */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ctext x='10' y='20' font-size='14' fill='%23ffffff'%3E%E2%98%85%3C/text%3E%3Ctext x='35' y='45' font-size='10' fill='%23ffffff'%3E%E2%98%85%3C/text%3E%3Ctext x='5' y='50' font-size='8' fill='%23ffffff'%3E%E2%98%85%3C/text%3E%3Ctext x='45' y='15' font-size='12' fill='%23ffffff'%3E%E2%98%85%3C/text%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            {/* Horizontal stripe hints — very faint */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 28px, #ffffff 28px, #ffffff 30px)',
            }} />

            {/* Dark left vignette for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/85 via-blue-950/40 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-white text-sm font-medium">Bad Credit? No Problem!</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Quality Used Cars in{' '}
                <span className="text-red-400">Rome, GA</span>
              </h1>
              
              <p className="text-xl text-gray-200 mb-8">
                Uptown Auto Sales offers a wide selection of quality used vehicles with 
                flexible financing options. Bad credit OK! In-house financing available.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/inventory"
                  onClick={() => ctaClick('browse_inventory', { source: 'hero' })}
                  className="inline-flex items-center justify-center px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Browse Inventory
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
                <a
                  href="tel:706-295-9700"
                  onClick={() => ctaClick('call', { source: 'hero' })}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Call 706-295-9700
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Quality Vehicles</div>
                <div className="text-sm text-gray-600">Thoroughly inspected</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Easy Financing</div>
                <div className="text-sm text-gray-600">Bad credit OK</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Family Owned</div>
                <div className="text-sm text-gray-600">Trusted since 2005</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">In-House Financing</div>
                <div className="text-sm text-gray-600">Flexible payment options</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Inventory */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">New Vehicles</h2>
              <p className="text-gray-600 mt-2">Browse our latest inventory</p>
            </div>
            <Link
              to="/inventory"
              onClick={() => ctaClick('view_all_inventory', { source: 'featured' })}
              className="text-red-600 font-semibold hover:text-red-700 flex items-center"
            >
              View All
              <ChevronRight className="ml-1 w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-80 animate-pulse"></div>
              ))}
            </div>
          ) : inventoryError ? (
            <div className="text-center py-12 text-gray-600">
              Unable to load inventory. Please try again later.
            </div>
          ) : featuredVehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No vehicles currently in inventory. Check back soon!
            </div>
          ) : (
            <VehicleCardCarousel
              vehicles={featuredVehicles.slice(0, 8)}
              onHover={preloadVehicles.preload}
            />
          )}
        </div>
      </section>

      {/* Quick Contact Form */}
      <section className="py-16 bg-gradient-to-br from-blue-900 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Get Pre-Approved Today!
              </h2>
              <p className="text-blue-100 mb-6">
                Fill out the form and our team will contact you within 24 hours 
                to discuss your financing options. Bad credit is OK!
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-white">
                  <CheckCircle className="w-5 h-5 text-red-400" />
                  <span>Quick approval process</span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <CheckCircle className="w-5 h-5 text-red-400" />
                  <span>Bad credit welcome</span>
                </div>
                <div className="flex items-center space-x-3 text-white">
                  <CheckCircle className="w-5 h-5 text-red-400" />
                  <span>Low down payments</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-2xl">
              {formStatus === 'success' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600">We'll contact you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="(706) 295-9700"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.hp}
                    onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {formStatus === 'loading' ? 'Submitting...' : 'Get Pre-Approved'}
                  </button>
                  {formStatus === 'error' && (
                    <p className="text-red-600 text-sm text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <Reviews />
    </div>
  );
}
