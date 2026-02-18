import { Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackCtaClick } from '../lib/analytics';

export default function Footer() {

  return (
    <footer className="relative bg-white border-t border-red-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/inventory" className="block text-gray-600 hover:text-red-600 text-sm transition-colors">
                Browse Inventory
              </Link>
              <Link to="/financing" className="block text-gray-600 hover:text-red-600 text-sm transition-colors">
                Get Approved
              </Link>
              <Link to="/trade-in" className="block text-gray-600 hover:text-red-600 text-sm transition-colors">
                Trade-In Value
              </Link>
              <Link to="/about" className="block text-gray-600 hover:text-red-600 text-sm transition-colors">
                About Us
              </Link>
              <Link to="/contact" className="block text-gray-600 hover:text-red-600 text-sm transition-colors">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <a href="tel:706-295-9700" onClick={() => trackCtaClick('call', { source: 'footer' })} className="flex items-center space-x-3 text-gray-600 hover:text-red-600 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                  <Phone className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">706-295-9700</span>
              </a>
              <div className="flex items-start space-x-3 text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-blue-700" />
                </div>
                <span className="text-sm">
                  1106 Shorter Ave NW, Rome, GA 30165
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Uptown Auto Sales. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <p className="text-gray-500 text-xs">
                Built From Scratch by{' '}
                <a
                  href="https://fender-ai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  Fender-AI
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
