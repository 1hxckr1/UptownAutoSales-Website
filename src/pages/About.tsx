import { Award, Users, Heart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            About <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Trinity</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Trinity Motorcar Company is your trusted automotive partner in Rome, Georgia. We're committed to providing exceptional vehicles, transparent pricing, and outstanding service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              At Trinity Motorcar Company, we believe car buying should be exciting, not stressful. Our mission is to provide quality vehicles at fair prices with a transparent, no-pressure approach that puts you in control.
            </p>
            <p className="text-gray-400 leading-relaxed">
              We're more than just a dealership. We're a family-owned business that treats every customer like part of our family. Whether you're buying your first car or upgrading to something new, we're here to help you every step of the way.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6">Our Promise</h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <p className="text-gray-400">No hidden fees or surprise charges</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <p className="text-gray-400">FREE CARFAX reports on every vehicle</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <p className="text-gray-400">Financing options for all credit situations</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <p className="text-gray-400">Extended warranties available for peace of mind</p>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <p className="text-gray-400">Bilingual staff ready to serve you</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            {
              icon: Award,
              title: 'Quality Selection',
              description: 'Carefully inspected vehicles that meet our high standards',
            },
            {
              icon: Users,
              title: 'Expert Team',
              description: 'Knowledgeable staff dedicated to finding your perfect match',
            },
            {
              icon: Heart,
              title: 'Customer First',
              description: 'Your satisfaction is our top priority, always',
            },
            {
              icon: Shield,
              title: 'Trustworthy',
              description: 'Transparent pricing and honest communication every time',
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center hover:border-blue-500/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Find Your <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Perfect Vehicle?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Visit us at our dealership in Rome, GA, or browse our inventory online. Our team is ready to help you drive home in your dream car.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/inventory"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 transition-all duration-300 hover:scale-105"
            >
              Browse Inventory
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
