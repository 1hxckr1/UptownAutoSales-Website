import { useState } from 'react';
import { Car, DollarSign, CheckCircle } from 'lucide-react';
import { fenderApi } from '../lib/fenderApi';
import { trackLeadSubmission } from '../lib/analytics';

type Condition = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export default function TradeInPage() {
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    mileage: '',
    condition: 'Good' as Condition,
    vin: '',
    payoff_amount: '',
    notes: '',
    hp: '', // 🪤 honeypot (bots only)
  });

  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🪤 if bot filled hidden field, silently stop
    if (formData.hp.trim().length > 0) return;

    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'trade_inquiry',
        hp: formData.hp,
        name: formData.customer_name,
        customer_name: formData.customer_name,
        phone: formData.phone,
        email: formData.email,
        vehicle_year: formData.vehicle_year ? Number(formData.vehicle_year) : undefined,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        mileage: formData.mileage ? Number(formData.mileage) : undefined,
        condition: formData.condition,
        vin: formData.vin,
        payoff_amount: formData.payoff_amount ? Number(formData.payoff_amount) : undefined,
        notes: formData.notes,
      });

      trackLeadSubmission('trade_inquiry', true);
      setFormStatus('success');
      setFormData({
        customer_name: '',
        phone: '',
        email: '',
        vehicle_year: '',
        vehicle_make: '',
        vehicle_model: '',
        mileage: '',
        condition: 'Good',
        vin: '',
        payoff_amount: '',
        notes: '',
        hp: '',
      });
    } catch (err) {
      trackLeadSubmission('trade_inquiry', false);
      console.error('Failed to submit trade-in request:', err);
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  if (formStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Submission Received!</h1>
            <p className="text-gray-400 text-lg mb-8">
              Thank you for your trade-in request. We'll evaluate your vehicle and contact you shortly.
            </p>
            <a
              href="tel:7062377668"
              className="inline-flex items-center space-x-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-105"
            >
              <span>Call Us Now: 706-237-7668</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Trade In{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Your Vehicle
            </span>
          </h1>
          <p className="text-gray-400 text-lg">Quick appraisal request. Simple paperwork. Fast turnaround.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center">
            <Car className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Easy Process</h3>
            <p className="text-gray-400 text-sm">A few details and you're done</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center">
            <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Fair Value</h3>
            <p className="text-gray-400 text-sm">We price trades competitively</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center">
            <CheckCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Quick Response</h3>
            <p className="text-gray-400 text-sm">We’ll contact you shortly</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 🪤 Honeypot field: hidden from humans */}
            <input
              type="text"
              name="hp"
              value={formData.hp}
              onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="md:col-span-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Vehicle Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Year *"
                  value={formData.vehicle_year}
                  onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  placeholder="Make *"
                  value={formData.vehicle_make}
                  onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  placeholder="Model *"
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />

                <input
                  type="number"
                  placeholder="Mileage *"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  required
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />

                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as Condition })}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>

                <input
                  type="text"
                  placeholder="VIN (optional)"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />

                <input
                  type="number"
                  placeholder="Payoff Amount (optional)"
                  value={formData.payoff_amount}
                  onChange={(e) => setFormData({ ...formData, payoff_amount: e.target.value })}
                  className="md:col-span-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />

                <textarea
                  placeholder="Notes (optional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={5}
                  className="md:col-span-3 w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={formStatus === 'loading'}
              className="w-full px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formStatus === 'loading' ? 'Submitting...' : formStatus === 'error' ? 'Error - Try Again' : 'Submit Trade-In Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
