import { Phone } from 'lucide-react';
import { trackCtaClick } from '../lib/analytics';

export default function MobileCallButton() {
  return (
    <a
      href="tel:7062959700"
      onClick={() => trackCtaClick('call', { source: 'mobile_fab' })}
      className="md:hidden fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-110 animate-pulse"
      aria-label="Call Now"
    >
      <Phone className="w-7 h-7 text-white" />
    </a>
  );
}
