import { Award, Users, Heart, Shield, Phone, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            About <span className="text-red-600">Uptown Auto Sales</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Your trusted hometown dealership in Rome, Georgia. Proudly serving Floyd County since 2004.
          </p>
        </div>

        {/* Family Photo + Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-red-100 via-white to-blue-100 -z-10" />
            <img
              src="/IMG_5464.jpeg"
              alt="The Uptown Auto Sales family team"
              className="w-full rounded-2xl shadow-xl object-contain"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3 shadow-md border border-gray-100">
              <div className="w-2 h-8 rounded-full bg-red-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#1a2a4a] uppercase tracking-widest">Family Owned &amp; Operated</p>
                <p className="text-sm text-gray-600">Proudly serving Rome, GA since 2004</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200">
              <Heart className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">Our Story</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              When you buy from Uptown, you are joining our <span className="text-red-600">family.</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed text-[1.05rem]">
              <p>
                At Uptown Auto Sales, we are proudly family owned and operated, and we believe that makes all the difference. We know purchasing a vehicle can feel overwhelming, which is why our knowledgeable, friendly team goes the extra mile to make the process easy and enjoyable.
              </p>
              <p>
                Whether you are shopping for a new or pre-owned vehicle, we take the time to listen, understand your needs, and help you find the perfect fit for your lifestyle and budget.
              </p>
              <p>
                With our dedication to excellent customer service and a wide selection of high quality vehicles, we are confident you will drive away feeling taken care of. Uptown Auto Sales has proudly served Rome, GA and Floyd County since 2004 — and we cannot wait to serve you next.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/inventory"
                className="px-7 py-3 rounded-lg bg-red-600 text-white font-semibold shadow-md hover:bg-red-700 transition-all text-center"
              >
                Browse Inventory
              </Link>
              <Link
                to="/contact"
                className="px-7 py-3 rounded-lg bg-white border-2 border-[#1a2a4a] text-[#1a2a4a] font-semibold hover:bg-blue-50 transition-all text-center"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>

        {/* Mission & Promise */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              At Uptown Auto Sales, we believe everyone deserves reliable transportation, 
              regardless of their credit history. Our mission is to provide quality pre-owned 
              vehicles with flexible financing options that work for real people with real budgets.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We're not just selling cars – we're building relationships. As a family-owned 
              business, we treat every customer like a neighbor, because you are! When you 
              buy from Uptown, you become part of our extended family.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Promise</h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                </div>
                <p className="text-gray-600">No hidden fees or surprise charges</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                </div>
                <p className="text-gray-600">Every vehicle thoroughly inspected</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                </div>
                <p className="text-gray-600">Financing options for ALL credit situations</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                </div>
                <p className="text-gray-600">In-house financing available</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                </div>
                <p className="text-gray-600">Friendly, no-pressure sales approach</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            {
              icon: Award,
              title: 'Quality Selection',
              description: 'Hand-picked vehicles that meet our strict quality standards',
            },
            {
              icon: Users,
              title: 'Expert Team',
              description: 'Friendly staff with decades of automotive experience',
            },
            {
              icon: Heart,
              title: 'Family Owned',
              description: 'Local business serving Rome, GA since 2005',
            },
            {
              icon: Shield,
              title: 'Trustworthy',
              description: 'Honest pricing and transparent financing every time',
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 border border-gray-200 text-center hover:border-red-300 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-8 md:p-12 mb-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Call Us</h3>
              <a href="tel:706-295-9700" className="text-blue-200 hover:text-white transition-colors">
                706-295-9700
              </a>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Visit Us</h3>
              <p className="text-blue-200">
                Rome, GA 30161
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Hours</h3>
              <p className="text-blue-200">
                Mon-Sat: 9AM-7PM<br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-200 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Find Your <span className="text-red-600">Perfect Vehicle?</span>
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Visit us in Rome, GA, or browse our inventory online. Whether you have 
            great credit, bad credit, or no credit – we can help you get approved!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/inventory"
              className="px-8 py-4 rounded-lg bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-300"
            >
              Browse Inventory
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 rounded-lg bg-white border-2 border-red-600 text-red-600 font-semibold hover:bg-red-50 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
