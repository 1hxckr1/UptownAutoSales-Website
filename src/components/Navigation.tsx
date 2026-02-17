import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1e]/95 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center" aria-label="Go to homepage">
            <img
              src="/trinity-wordmark.jpg"
              alt={dealer?.name || 'Trinity Motorcar Company'}
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-1 py-6 text-sm font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4dd4d4] shadow-[0_0_10px_#4dd4d4]"></div>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/contact"
              onClick={() => trackCtaClick('contact', { source: 'navigation' })}
              className="px-6 py-2 rounded-full border border-[#4dd4d4]/50 bg-[#4dd4d4]/10 text-[#4dd4d4] text-sm font-medium hover:bg-[#4dd4d4]/20 transition-all"
            >
              Contact Us
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#0a0f1e] backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'bg-[#4dd4d4]/20 text-[#4dd4d4]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
