import { Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDealer } from '../contexts/DealerContext';
import { trackCtaClick } from '../lib/analytics';

export default function Footer() {
  const { dealer } = useDealer();

  return (
    <footer className="relative bg-black/50 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {dealer?.logo_url ? (
                <img src={dealer.logo_url} alt={dealer.name} className="h-12 w-auto" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
              )}
              <div>
                <div className="text-white font-bold text-xl">Trinity Motorcar Company</div>
                <div className="text-blue-400 text-xs tracking-widest"></div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Your trusted dealership in Rome, GA. Quality vehicles, honest pricing, and exceptional service.
            </p>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
              aria-label="Go to homepage"
            >
              <img
                src="/trinity-wordmark.jpg"
                alt="Trinity Motorcar"
                className="h-12 w-auto object-contain"
              />
            </Link>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/inventory" className="block text-gray-400 hover:text-blue-400 text-sm transition-colors">
                Browse Inventory
              </Link>
              <Link to="/financing" className="block text-gray-400 hover:text-blue-400 text-sm transition-colors">
                Get Approved
              </Link>
              <Link to="/trade-in" className="block text-gray-400 hover:text-blue-400 text-sm transition-colors">
                Trade-In Value
              </Link>
              <Link to="/about" className="block text-gray-400 hover:text-blue-400 text-sm transition-colors">
                About Us
              </Link>
              <Link to="/contact" className="block text-gray-400 hover:text-blue-400 text-sm transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <a href="tel:706-237-7668" onClick={() => trackCtaClick('call', { source: 'footer' })} className="flex items-center space-x-3 text-gray-400 hover:text-blue-400 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm">706-237-7668</span>
              </a>
              <div className="flex items-start space-x-3 text-gray-400">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-sm">
                  1300 Dean Ave SE<br />
                  Rome, GA 30161
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Trinity Motorcar Company. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <p className="text-gray-500 text-xs">
                Built From Scratch by{' '}
                <a
                  href="https://fender-ai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Fender-AI
                </a>
              </p>
              <Link
                to="/admin/login"
                className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
