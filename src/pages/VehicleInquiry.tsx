import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageSquare, CheckCircle, Calendar, Phone as PhoneIcon, Search, ChevronDown } from 'lucide-react';
import { fenderApi } from '../lib/fenderApi';
import { useDealer } from '../contexts/DealerContext';
import { trackLeadSubmission } from '../lib/analytics';
import { useInventory } from '../lib/apiHooks';

export default function VehicleInquiry() {
  const [searchParams] = useSearchParams();
  const { dealer } = useDealer();
  const { data: inventoryData, isLoading: loadingInventory } = useInventory({ limit: 1000 });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    vehicle_interest: searchParams.get('vehicle') || '',
    inquiry_type: 'more_info',
    preferred_contact_time: '',
    message: '',
    hp: '', // ✅ honeypot
  });

  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const vehicles = inventoryData?.vehicles || [];

  const filteredVehicles = vehicles.filter((vehicle) => {
    const vehicleString = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.toLowerCase();
    return vehicleString.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const vehicleParam = searchParams.get('vehicle');
    if (vehicleParam) {
      setFormData((prev) => ({ ...prev, vehicle_interest: vehicleParam }));
      setSearchTerm(vehicleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVehicleSelect = (vehicle: (typeof vehicles)[0]) => {
    const vehicleText = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.trim();
    setSearchTerm(vehicleText);
    setFormData((prev) => ({ ...prev, vehicle_interest: vehicleText }));
    setShowDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setFormData((prev) => ({ ...prev, vehicle_interest: value }));
    setShowDropdown(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'lead',
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email,
        vehicle_interest: formData.vehicle_interest,
        inquiry_type: formData.inquiry_type,
        preferred_contact_time: formData.preferred_contact_time,
        message: formData.message,
        hp: formData.hp, // ✅ send honeypot
      });

      trackLeadSubmission('lead', true, { source: 'inquiry_page', inquiry_type: formData.inquiry_type });
      setFormStatus('success');

      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        vehicle_interest: '',
        inquiry_type: 'more_info',
        preferred_contact_time: '',
        message: '',
        hp: '',
      });

      setSearchTerm('');
      setShowDropdown(false);

      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (err) {
      trackLeadSubmission('lead', false, { source: 'inquiry_page', inquiry_type: formData.inquiry_type });
      setFormStatus('error');
      console.error('Failed to submit inquiry:', err);
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  if (formStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-sm text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Request Sent!</h1>
            <p className="text-gray-600 text-lg mb-8">
              Thanks! We&apos;ll reach out shortly with more details.
            </p>

            {dealer?.phone ? (
              <a
                href={`tel:${dealer.phone}`}
                className="inline-flex items-center space-x-2 px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-all duration-300"
              >
                <PhoneIcon className="w-5 h-5" />
                <span>Call Us: {dealer.phone}</span>
              </a>
            ) : (
              <Link
                to="/inventory"
                className="inline-flex items-center space-x-2 px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-all duration-300"
              >
                <span>Back to Inventory</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Vehicle <span className="text-red-600">Inquiry</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Ask about a vehicle, availability, pricing, or financing options.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              name="hp"
              value={formData.hp}
              onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name *"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <input
                type="text"
                placeholder="Last Name *"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="tel"
                placeholder="Phone *"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={loadingInventory ? 'Loading vehicles...' : 'Search vehicle (Year Make Model Trim)'}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-12 pr-12 px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {showDropdown && filteredVehicles.length > 0 && (
                <div className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  {filteredVehicles.slice(0, 25).map((vehicle) => {
                    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.trim();
                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleVehicleSelect(vehicle)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-900"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.inquiry_type}
                onChange={(e) => setFormData({ ...formData, inquiry_type: e.target.value })}
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="more_info">More Info</option>
                <option value="availability">Availability</option>
                <option value="price">Price / Payment</option>
                <option value="financing">Financing</option>
                <option value="test_drive">Schedule Test Drive</option>
              </select>

              <input
                type="text"
                placeholder="Preferred contact time (optional)"
                value={formData.preferred_contact_time}
                onChange={(e) => setFormData({ ...formData, preferred_contact_time: e.target.value })}
                className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <textarea
              placeholder="Your message *"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
            />

            <button
              type="submit"
              disabled={formStatus === 'loading'}
              className="w-full px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formStatus === 'loading' ? 'Sending...' : formStatus === 'error' ? 'Error - Try Again' : 'Send Inquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
