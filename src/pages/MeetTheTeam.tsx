import { Phone, Mail, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMember {
  name: string;
  title: string;
  bio: string;
  photo?: string;
  initials: string;
  color: string;
}

const team: TeamMember[] = [
  {
    name: 'Anthony Owens',
    title: 'Owner & Dealer Principal',
    bio: 'Anthony founded Uptown Auto Sales in 2004 with a simple mission: treat every customer like family. With over 20 years in the automotive industry, he personally oversees every vehicle that comes through the lot to ensure quality you can count on.',
    initials: 'AO',
    color: 'bg-red-600',
  },
  {
    name: 'Sales Team',
    title: 'Sales Consultants',
    bio: 'Our sales team is here to guide you — no pressure, no games. We take the time to understand what you need and match you with the right vehicle at the right price.',
    initials: 'ST',
    color: 'bg-blue-700',
  },
  {
    name: 'Finance Team',
    title: 'Finance & Credit Specialists',
    bio: 'Our finance specialists work with a wide network of lenders to find you the best possible rate. Whether your credit is great or needs work, we will find a solution that fits your budget.',
    initials: 'FT',
    color: 'bg-gray-700',
  },
  {
    name: 'Service Team',
    title: 'Reconditioning & Detail',
    bio: 'Every vehicle on our lot goes through a thorough inspection and reconditioning process before it ever reaches a customer. Our team takes pride in delivering clean, well-maintained vehicles.',
    initials: 'SV',
    color: 'bg-red-800',
  },
];

export default function MeetTheTeam() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-3">Our People</p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-5">
            Meet The <span className="text-red-600">Team</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            The faces behind Uptown Auto Sales. We are a tight-knit group of car people who genuinely care about
            helping our community get into great vehicles.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {team.map((member) => (
            <div
              key={member.name}
              className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="flex items-start gap-6 p-8">
                <div className={`${member.color} w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                  <span className="text-white text-2xl font-bold">{member.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-red-600 text-sm font-semibold uppercase tracking-wider mb-4">{member.title}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Values Strip */}
        <div className="bg-gray-50 rounded-3xl p-10 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: Star, label: 'Integrity', desc: 'Honest pricing and transparent deals — every time.' },
              { icon: Phone, label: 'Accessibility', desc: 'Real people answering real questions. Call us anytime.' },
              { icon: Mail, label: 'Community', desc: 'Proudly rooted in Rome, Georgia since 2004.' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-red-600" />
                </div>
                <p className="font-bold text-gray-900">{label}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Come Say Hello</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            Stop by the lot, give us a call, or send us a message. We would love to help you find your next vehicle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:7062959700"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
            >
              <Phone className="w-4 h-4" />
              706-295-9700
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:border-red-600 hover:text-red-600 transition-all"
            >
              Send a Message
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
