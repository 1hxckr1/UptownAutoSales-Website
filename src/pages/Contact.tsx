import { useState } from 'react';
import { Phone, MapPin, Clock, Mail, MessageSquare } from 'lucide-react';
import { fenderApi } from '../lib/fenderApi';
import { useDealer } from '../contexts/DealerContext';
import { useAnalytics } from '../hooks/useAnalytics';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '', hp: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { dealer } = useDealer();
  const { leadSubmission } = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hp.trim().length > 0) return;
    setFormStatus('loading');

    try {
      await fenderApi.submitForm({
        type: 'contact',
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        message: formData.message,
        hp: formData.hp,
      });

      leadSubmission('contact', true);
      setFormStatus('success');
      setFormData({ name: '', phone: '', email: '', message: '', hp: '' });
      setTimeout(() => setFormStatus('idle'), 3000);
    } catch (err) {
      leadSubmission('contact', false);
      setFormStatus('error');
      console.error('Failed to submit form:', err);
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Get In <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-gray-400 text-lg">
            We're here to answer your questions and help you find your perfect vehicle
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/10">
              <h2 className="text-3xl font-bold text-white mb-8">Send Us a Message</h2>
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
                    placeholder="Your Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <textarea
                  placeholder="Your Message *"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                ></textarea>
                <button
                  type="submit"
                  disabled={formStatus === 'loading'}
                  className="w-full px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formStatus === 'loading' ? 'Sending...' : formStatus === 'success' ? 'Message Sent!' : formStatus === 'error' ? 'Error - Try Again' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            {dealer && (
              <>
                {dealer.phone && (
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
                    <div className="flex items-start space-x-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Phone</h3>
                        <a href={`tel:${dealer.phone}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                          {dealer.phone}
                        </a>
                      </div>
                    </div>

                    {dealer.address && (
                      <div className="flex items-start space-x-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold mb-2">Address</h3>
                          <p className="text-gray-400">
                            {dealer.address}<br />
                            {dealer.city}, {dealer.state} {dealer.zip_code}
                          </p>
                        </div>
                      </div>
                    )}

                    {(dealer.email || dealer.website_url) && (
                      <div className="flex items-start space-x-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold mb-2">Contact</h3>
                          {dealer.email && (
                            <a href={`mailto:${dealer.email}`} className="text-blue-400 hover:text-blue-300 transition-colors block mb-1">
                              {dealer.email}
                            </a>
                          )}
                          {dealer.website_url && (
                            <a href={dealer.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors block">
                              Visit Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Hours</h3>
                        <div className="text-gray-400 text-sm space-y-1">
                          <p>Mon - Sat: 9:30 AM - 7:30 PM</p>
                          <p>Sunday: Closed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <MessageSquare className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-white font-semibold mb-2">Ready to Help</h3>
              <p className="text-gray-400 text-sm">
                Our team is here to answer all your questions and help you find the perfect vehicle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
