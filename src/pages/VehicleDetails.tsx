import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, ArrowLeft, Gauge, Fuel, Calendar, Palette, Paintbrush, Zap, FileText, ExternalLink, MessageSquare, RefreshCw } from 'lucide-react';
import { fenderApi } from '../lib/fenderApi';
import { useDealer } from '../contexts/DealerContext';
import { useVehicle } from '../lib/apiHooks';
import { isValidVin, getCarfaxUrl } from '../lib/carfax';
import { CarfaxBadges } from '../components/CarfaxBadges';
import VehicleMediaGallery from '../components/VehicleMediaGallery';
import { useAnalytics } from '../hooks/useAnalytics';

export default function VehicleDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '', hp: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { dealer } = useDealer();
  const { data: vehicle, isLoading: loading, error: queryError } = useVehicle(slug);
  const { track, ctaClick, leadSubmission } = useAnalytics();
  const trackedDetailView = useRef(false);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load vehicle') : null;

  useEffect(() => {
    if (vehicle) {
      const title = [vehicle.year > 0 ? vehicle.year : '', vehicle.make, vehicle.model].filter(Boolean).join(' ');
      document.title = title ? `${title} | ${dealer?.name || 'Dealership'}` : dealer?.name || 'Dealership';
    }
    return () => { document.title = dealer?.name || 'Dealership'; };
  }, [vehicle, dealer]);

  useEffect(() => {
    if (vehicle && !trackedDetailView.current) {
      trackedDetailView.current = true;
      track('vehicle_detail_view', {
        vehicle_id: vehicle.id,
        vin: vehicle.vin,
        stock_number: vehicle.stock_number,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        price: vehicle.asking_price,
      });
    }
  }, [vehicle, track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hp.trim().length > 0) return;
    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'lead',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        vehicle_interest: vehicle?.id,
        hp: formData.hp,
      });

      leadSubmission('lead', true, { source: 'vehicle_detail', vehicle_id: vehicle?.id });
      setFormStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '', hp: '' });
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (err) {
      leadSubmission('lead', false, { source: 'vehicle_detail', vehicle_id: vehicle?.id });
      setFormStatus('error');
      console.error('Failed to submit form:', err);
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-4">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Vehicle not found'}</p>
          <Link to="/inventory" className="text-blue-400 hover:text-blue-300">
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const descriptionParagraphs = vehicle.description
    ? vehicle.description.split(/\n\n+/).filter(p => p.trim())
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/inventory"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Inventory</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <VehicleMediaGallery vehicle={vehicle} />

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h1 className="text-4xl font-bold text-white mb-2">
                {vehicle.year > 0 ? vehicle.year : ''} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.trim && <p className="text-gray-400 text-xl mb-2">{vehicle.trim}</p>}
              {vehicle.stock_number && (
                <p className="text-gray-500 text-sm mb-4">Stock #{vehicle.stock_number}</p>
              )}

              <CarfaxBadges vehicle={vehicle} layout="row" />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 mb-8">
                {vehicle.year > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Calendar className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">Year</div>
                    <div className="text-white font-semibold">{vehicle.year}</div>
                  </div>
                )}
                {vehicle.mileage > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Gauge className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">Mileage</div>
                    <div className="text-white font-semibold">{vehicle.mileage.toLocaleString()} mi</div>
                  </div>
                )}
                {vehicle.fuel_type && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Fuel className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">Fuel Type</div>
                    <div className="text-white font-semibold">{vehicle.fuel_type}</div>
                  </div>
                )}
                {(vehicle.color || vehicle.exterior_color) && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Palette className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">Exterior Color</div>
                    <div className="text-white font-semibold">{vehicle.color || vehicle.exterior_color}</div>
                  </div>
                )}
                {vehicle.interior_color && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Paintbrush className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">Interior Color</div>
                    <div className="text-white font-semibold">{vehicle.interior_color}</div>
                  </div>
                )}
                {(vehicle.mpg?.city != null || vehicle.mpg?.highway != null) && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Zap className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-gray-400 text-sm">
                      {vehicle.mpg?.city != null && vehicle.mpg?.highway != null
                        ? 'Avg MPG'
                        : vehicle.mpg?.city != null ? 'City MPG' : 'Hwy MPG'}
                    </div>
                    <div className="text-white font-semibold">
                      {vehicle.mpg?.city != null && vehicle.mpg?.highway != null
                        ? Math.round((vehicle.mpg.city + vehicle.mpg.highway) / 2)
                        : vehicle.mpg?.city ?? vehicle.mpg?.highway}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {descriptionParagraphs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
                    <div className="space-y-3">
                      {descriptionParagraphs.map((paragraph, index) => (
                        <p key={index} className="text-gray-400 leading-relaxed whitespace-pre-line">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {vehicle.ai_detected_features && typeof vehicle.ai_detected_features === 'object' && 'confirmed' in vehicle.ai_detected_features && (vehicle.ai_detected_features.confirmed?.length > 0 || vehicle.ai_detected_features.suggested?.length > 0) ? (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {vehicle.ai_detected_features.confirmed?.map((feature, index) => (
                        <div key={`confirmed-${index}`} className="flex items-center space-x-2 text-gray-400">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span>{feature}</span>
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Verified</span>
                        </div>
                      ))}
                      {vehicle.ai_detected_features.suggested?.map((feature, index) => (
                        <div key={`suggested-${index}`} className="flex items-center space-x-2 text-gray-400">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span>{feature}</span>
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">AI Detected</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : vehicle.ai_detected_features && Array.isArray(vehicle.ai_detected_features) && vehicle.ai_detected_features.length > 0 ? (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {vehicle.ai_detected_features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2 text-gray-400">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : vehicle.features && vehicle.features.length > 0 ? (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {vehicle.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2 text-gray-400">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Specifications</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.body_style && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Body Style</span>
                        <span className="text-white font-semibold">{vehicle.body_style}</span>
                      </div>
                    )}
                    {vehicle.transmission && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Transmission</span>
                        <span className="text-white font-semibold">{vehicle.transmission}</span>
                      </div>
                    )}
                    {vehicle.drivetrain && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Drivetrain</span>
                        <span className="text-white font-semibold">{vehicle.drivetrain}</span>
                      </div>
                    )}
                    {(vehicle.engine || vehicle.engine_type) && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Engine</span>
                        <span className="text-white font-semibold">{vehicle.engine || vehicle.engine_type}</span>
                      </div>
                    )}
                    {(vehicle.color || vehicle.exterior_color) && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Exterior Color</span>
                        <span className="text-white font-semibold">{vehicle.color || vehicle.exterior_color}</span>
                      </div>
                    )}
                    {vehicle.interior_color && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Interior Color</span>
                        <span className="text-white font-semibold">{vehicle.interior_color}</span>
                      </div>
                    )}
                    {vehicle.mpg?.city != null && typeof vehicle.mpg.city === 'number' && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">MPG City</span>
                        <span className="text-white font-semibold">{vehicle.mpg.city} mpg</span>
                      </div>
                    )}
                    {vehicle.mpg?.highway != null && typeof vehicle.mpg.highway === 'number' && (
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">MPG Highway</span>
                        <span className="text-white font-semibold">{vehicle.mpg.highway} mpg</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-white/10 col-span-full">
                      <span className="text-gray-400">VIN</span>
                      <span className="text-white font-semibold text-sm">{vehicle.vin}</span>
                    </div>
                  </div>
                </div>

                {vehicle.notes && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Additional Notes</h2>
                    <p className="text-gray-400 leading-relaxed whitespace-pre-line">{vehicle.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 sticky top-24">
              {vehicle.compare_price && vehicle.compare_price > 0 && (
                <div className="text-gray-500 text-sm line-through mb-1">
                  Market Value: ${vehicle.compare_price.toLocaleString()}
                </div>
              )}
              {vehicle.asking_price && vehicle.asking_price > 0 ? (
                <>
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                    ${vehicle.asking_price.toLocaleString()}
                  </div>
                  {vehicle.compare_price && vehicle.compare_price > 0 && (
                    <p className="text-green-400 text-sm mb-2">
                      Save ${(vehicle.compare_price - vehicle.asking_price).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  Call for Price
                </div>
              )}

              <CarfaxBadges vehicle={vehicle} layout="grid" />

              <p className="text-gray-400 mt-4 mb-8">Contact us for details</p>

              <div className="space-y-3 mb-8">
                {dealer?.phone && (
                  <a
                    href={`tel:${dealer.phone}`}
                    onClick={() => ctaClick('call', { source: 'vehicle_detail', vehicle_id: vehicle.id })}
                    className="flex items-center justify-center space-x-2 w-full px-6 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-105"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call Now</span>
                  </a>
                )}
                <Link
                  to={`/inquiry?vehicle=${encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`)}`}
                  onClick={() => ctaClick('inquiry', { source: 'vehicle_detail', vehicle_id: vehicle.id })}
                  className="flex items-center justify-center space-x-2 w-full px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Inquire About This Vehicle</span>
                </Link>
                <Link
                  to="/financing"
                  onClick={() => ctaClick('finance', { source: 'vehicle_detail', vehicle_id: vehicle.id })}
                  className="flex items-center justify-center w-full px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300"
                >
                  Get Pre-Approved
                </Link>
                <Link
                  to="/trade-in"
                  onClick={() => ctaClick('trade', { source: 'vehicle_detail', vehicle_id: vehicle.id })}
                  className="flex items-center justify-center space-x-2 w-full px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 hover:text-white transition-all duration-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Trade-In Your Vehicle</span>
                </Link>
                {isValidVin(vehicle) ? (
                  <button
                    onClick={() => {
                      ctaClick('carfax_view', { source: 'vehicle_detail', vehicle_id: vehicle.id });
                      const url = getCarfaxUrl(vehicle);
                      if (url) window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="group relative flex items-center justify-center space-x-2 w-full px-6 py-3.5 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 text-orange-300 font-semibold hover:from-orange-500/30 hover:to-orange-600/30 hover:border-orange-400/50 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>View CARFAX Report</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="flex items-center justify-center space-x-2 w-full px-6 py-3.5 rounded-full bg-white/5 border border-white/10 text-gray-500 font-medium cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">CARFAX Report</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      CARFAX not available (VIN missing)
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-white/10">
                <h3 className="text-white font-semibold mb-4">Request Information</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
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
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
                  />
                  <textarea
                    placeholder="Message (optional)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none text-sm"
                  ></textarea>
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {formStatus === 'loading' ? 'Sending...' : formStatus === 'success' ? 'Sent!' : formStatus === 'error' ? 'Error - Try Again' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
