import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';
import { useDealer } from '../contexts/DealerContext';
import { trackCtaClick } from '../lib/analytics';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const aboutTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const { dealer } = useDealer();

  const navLinks = [
    { path: '/inventory', label: 'Inventory' },
    { path: '/financing', label: 'Financing' },
    { path: '/trade-in', label: 'Trade-In' },
  ];

  const aboutLinks = [
    { path: '/about', label: 'About Us' },
    { path: '/meet-the-team', label: 'Meet The Team' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAboutActive = aboutLinks.some((l) => location.pathname === l.path);

  const handleAboutEnter = () => {
    if (aboutTimeout.current) clearTimeout(aboutTimeout.current);
    setAboutOpen(true);
  };

  const handleAboutLeave = () => {
    aboutTimeout.current = setTimeout(() => setAboutOpen(false), 120);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-red-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center" aria-label="Go to homepage">
            <img src="/uptown-logo.png" alt="Uptown Auto Sales" className="h-10 w-auto" />
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

            {/* About Us Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleAboutEnter}
              onMouseLeave={handleAboutLeave}
            >
              <button
                className={`relative flex items-center gap-1 px-1 py-6 text-sm font-medium transition-all duration-300 ${
                  isAboutActive ? 'text-red-600' : 'text-gray-700 hover:text-red-600'
                }`}
              >
                About Us
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
                {isAboutActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
                )}
              </button>

              {aboutOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 overflow-hidden">
                  {aboutLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setAboutOpen(false)}
                      className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive(link.path)
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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

            {/* Mobile About Us accordion */}
            <div>
              <button
                onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isAboutActive ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                <span>About Us</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileAboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileAboutOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {aboutLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => { setIsOpen(false); setMobileAboutOpen(false); }}
                      className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                        isActive(link.path)
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

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
