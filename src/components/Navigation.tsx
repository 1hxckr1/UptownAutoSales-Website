import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';
import { useDealer } from '../contexts/DealerContext';
import { trackCtaClick } from '../lib/analytics';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { dealer } = useDealer();

  const navLinks = [
    { path: '/inventory', label: 'Inventory' },
    { path: '/financing', label: 'Financing' },
    { path: '/trade-in', label: 'Trade-In' },
    { path: '/about', label: 'About Us' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-red-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2" aria-label="Go to homepage">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">U</span>
            </div>
            <span className="text-gray-900 font-bold text-lg hidden sm:block">Uptown Auto Sales</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-1 py-6 text-sm font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'text-red-600'
                    : 'text-gray-700 hover:text-red-600'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a 
              href="tel:706-295-9700" 
              onClick={() => trackCtaClick('call', { source: 'navigation' })}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">706-295-9700</span>
            </a>
            <Link
              to="/contact"
              onClick={() => trackCtaClick('contact', { source: 'navigation' })}
              className="px-6 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
            >
              Contact Us
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-red-200 shadow-lg">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a 
              href="tel:706-295-9700" 
              onClick={() => { trackCtaClick('call', { source: 'mobile-nav' }); setIsOpen(false); }}
              className="flex items-center space-x-2 px-4 py-3 text-red-600 font-medium"
            >
              <Phone className="w-4 h-4" />
              <span>Call Now: 706-295-9700</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
