import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Shield, FileCheck, Heart, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0a0f1e]">
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#1a1f3e] to-[#0a0f1e]"></div>

        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#4dd4d4] to-transparent shadow-[0_0_20px_#4dd4d4] animate-pulse"></div>
        <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent shadow-[0_0_15px_#8b5cf6] animate-pulse" style={{ animationDelay: '0.5s' }}></div>

        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(77, 212, 212, 0.05) 25%, rgba(77, 212, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(77, 212, 212, 0.05) 75%, rgba(77, 212, 212, 0.05) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(77, 212, 212, 0.05) 25%, rgba(77, 212, 212, 0.05) 26%, transparent 27%, transparent 74%, rgba(77, 212, 212, 0.05) 75%, rgba(77, 212, 212, 0.05) 76%, transparent 77%)',
          backgroundSize: '50px 50px',
          opacity: 0.3
        }}></div>

        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
            THE FUTURE OF CAR BUYING IS HERE.
            <br />
            <span className="text-[#4dd4d4]">
              YOUR JOURNEY STARTS NOW.
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <Link
              to="/inventory"
              onClick={() => ctaClick('browse_inventory', { source: 'homepage_hero' })}
              className="px-8 py-3.5 rounded-full border-2 border-[#4dd4d4]/50 bg-[#4dd4d4]/10 backdrop-blur-md text-white font-medium hover:border-[#4dd4d4] hover:bg-[#4dd4d4]/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(77,212,212,0.5)] text-sm uppercase tracking-wider"
            >
              Browse Inventory
            </Link>
            <Link
              to="/financing"
              onClick={() => ctaClick('get_approved', { source: 'homepage_hero' })}
              className="px-8 py-3.5 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-md text-white font-medium hover:border-white/50 hover:bg-white/10 transition-all duration-300 text-sm uppercase tracking-wider"
            >
              Get Approved Instantly
            </Link>
            {dealer?.phone && (
              <a
                href={`tel:${dealer.phone}`}
                onClick={() => ctaClick('call', { source: 'homepage_hero' })}
                className="flex items-center space-x-2 px-8 py-3.5 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-md text-white font-medium hover:border-white/50 hover:bg-white/10 transition-all duration-300 text-sm uppercase tracking-wider"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="relative py-16 bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              FEATURED <span className="text-[#4dd4d4]">INVENTORY</span>
            </h2>
            <p className="text-gray-400">Discover our latest arrivals</p>
          </div>

          {inventoryError && (
            <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <p className="text-red-400 text-sm">
                Inventory unavailable — please try again later or contact us directly.
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#4dd4d4]"></div>
              <p className="text-gray-400 mt-4">Loading vehicles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.slice(0, 6).map((vehicle, index) => (
                <Link
                  key={vehicle.id}
                  to={`/inventory/${vehicle.slug || vehicle.id}`}
                  className="group relative bg-gradient-to-br from-[#8b5cf6]/20 via-[#3b82f6]/20 to-[#4dd4d4]/20 backdrop-blur-xl rounded-3xl overflow-hidden border-2 border-[#4dd4d4]/30 hover:border-[#4dd4d4] transition-all duration-300 hover:shadow-[0_0_40px_rgba(77,212,212,0.4)]"
                  style={{
                    animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
                    animationDelay: `${index * 0.2}s`
                  }}
                  onMouseEnter={preloadVehicles}
                >
                  <VehicleCardCarousel
                    photoUrls={vehicle.photo_urls?.length > 0 ? vehicle.photo_urls : vehicle.primary_photo_url ? [vehicle.primary_photo_url] : []}
                    photoCount={vehicle.photo_count}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    aspectRatio="aspect-[4/3]"
                    priority={index < 3}
                    className="group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {vehicle.year} {vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}
                    </h3>
                    <p className="text-[#4dd4d4] text-xs mb-1 uppercase tracking-wider">{vehicle.trim || 'Premium Edition'}</p>
                    {vehicle.color && (
                      <p className="text-white/50 text-xs mb-4 uppercase tracking-wider">{vehicle.color}</p>
                    )}
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <div className="text-white text-xs mb-1 opacity-60">PRICE</div>
                        {vehicle.compare_price && (
                          <div className="text-gray-500 text-xs line-through mb-0.5">
                            Market Value: ${formatCurrency(vehicle.compare_price)}
                          </div>
                        )}
                        <div className="text-white text-2xl font-bold">
                          ${formatCurrency(vehicle.asking_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xs mb-1 opacity-60">ODOMETER</div>
                        <div className="text-white text-lg font-semibold">{formatNumber(vehicle.mileage)} mi</div>
                      </div>
                    </div>

                    {(vehicle.fuel_type || vehicle.transmission || vehicle.drivetrain) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {vehicle.fuel_type && (
                          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs border border-white/20">
                            {vehicle.fuel_type}
                          </span>
                        )}
                        {vehicle.transmission && (
                          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs border border-white/20">
                            {vehicle.transmission}
                          </span>
                        )}
                        {vehicle.drivetrain && (
                          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs border border-white/20">
                            {vehicle.drivetrain}
                          </span>
                        )}
                      </div>
                    )}

                    <button className="w-full py-3 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-md text-white text-sm font-medium uppercase tracking-wider hover:border-white/50 hover:bg-white/10 transition-all duration-300">
                      View Details
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/inventory"
              className="inline-block px-8 py-3.5 rounded-full border-2 border-[#4dd4d4]/50 bg-[#4dd4d4]/10 backdrop-blur-md text-white font-medium hover:border-[#4dd4d4] hover:bg-[#4dd4d4]/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(77,212,212,0.5)] text-sm uppercase tracking-wider"
            >
              View All Inventory
            </Link>
          </div>
        </div>
      </section>

      <Reviews />

      <section className="relative py-16 bg-[#0a0f1e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-[#8b5cf6]/10 via-[#3b82f6]/10 to-[#4dd4d4]/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-[#4dd4d4]/40 overflow-hidden shadow-[0_0_60px_rgba(77,212,212,0.3)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4dd4d4]/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#8b5cf6]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="50" stroke="url(#gauge-gradient)" strokeWidth="3" opacity="0.3"/>
                  <circle cx="60" cy="60" r="50" stroke="#4dd4d4" strokeWidth="3" strokeDasharray="157 314" strokeDashoffset="78" strokeLinecap="round" className="animate-pulse"/>
                  <circle cx="60" cy="60" r="35" fill="#4dd4d4" fillOpacity="0.1"/>
                  <text x="60" y="70" textAnchor="middle" fill="#4dd4d4" fontSize="24" fontWeight="bold">%</text>
                  <defs>
                    <linearGradient id="gauge-gradient" x1="10" y1="10" x2="110" y2="110">
                      <stop stopColor="#4dd4d4"/>
                      <stop offset="1" stopColor="#8b5cf6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  FINANCING, SIMPLIFIED.
                </h2>
                <p className="text-gray-300 text-lg mb-6 uppercase tracking-wide">
                  Transparent, Approval in Minutes, No Pressure.
                </p>
                <Link
                  to="/financing"
                  className="inline-block px-8 py-3.5 rounded-full border-2 border-[#4dd4d4]/50 bg-[#4dd4d4]/10 backdrop-blur-md text-white font-medium hover:border-[#4dd4d4] hover:bg-[#4dd4d4]/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(77,212,212,0.5)] text-sm uppercase tracking-wider"
                >
                  Check Your Rate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'WARRANTIES', subtitle: 'AVAILABLE' },
              { icon: FileCheck, title: 'FREE CARFAX', subtitle: 'REPORTS' },
              { icon: Heart, title: 'HASSLE-FREE-APPROVAL', subtitle: 'GUARANTEE' },
              { icon: CheckCircle, title: 'EASY', subtitle: 'PROCESS' },
            ].map((item, index) => (
              <div
                key={index}
                className="text-center group"
              >
                <div className="w-16 h-16 mx-auto mb-6">
                  <item.icon className="w-full h-full text-white opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 uppercase tracking-wider">{item.title}</h3>
                <p className="text-white text-xs opacity-60 uppercase tracking-wider">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 bg-[#0a0f1e]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4dd4d4]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {dealer?.logo_url && (
                <img src={dealer.logo_url} alt={dealer.name} className="h-16 w-auto" />
              )}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Ready to find your<br />
                  <span className="bg-gradient-to-r from-[#4dd4d4] to-blue-400 bg-clip-text text-transparent">next vehicle?</span>
                </h2>
                <p className="text-gray-400 mt-4 text-lg max-w-md">
                  Drop your name and number and one of our experts will reach out to help you get started.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-12 gap-y-4 pt-4">
                <div>
                  <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Resources</h3>
                  <div className="space-y-2.5">
                    <Link to="/inventory" className="group flex items-center text-gray-300 hover:text-[#4dd4d4] transition-colors text-sm">
                      <span>Inventory</span>
                      <svg className="w-3 h-3 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link to="/contact" className="group flex items-center text-gray-300 hover:text-[#4dd4d4] transition-colors text-sm">
                      <span>Contact</span>
                      <svg className="w-3 h-3 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-white/60 font-semibold mb-3 uppercase tracking-wider text-xs">Company</h3>
                  <div className="space-y-2.5">
                    <Link to="/about" className="group flex items-center text-gray-300 hover:text-[#4dd4d4] transition-colors text-sm">
                      <span>About Us</span>
                      <svg className="w-3 h-3 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link to="/financing" className="group flex items-center text-gray-300 hover:text-[#4dd4d4] transition-colors text-sm">
                      <span>Financing</span>
                      <svg className="w-3 h-3 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/20">
                <h3 className="text-xl font-bold text-white mb-6 text-center uppercase tracking-wide">
                  Connect with an Expert
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    name="hp"
                    value={formData.hp}
                    onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#4dd4d4]/50 focus:bg-white/[0.08] transition-all text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#4dd4d4]/50 focus:bg-white/[0.08] transition-all text-sm"
                  />
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-[#4dd4d4] to-blue-500 text-white font-semibold uppercase tracking-wider text-sm hover:shadow-[0_0_30px_rgba(77,212,212,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
                  >
                    {formStatus === 'loading' ? 'Sending...' : formStatus === 'success' ? 'Sent!' : formStatus === 'error' ? 'Error - Try Again' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} {dealer?.name || 'Dealership'}. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
