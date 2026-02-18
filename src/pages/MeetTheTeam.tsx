import { Phone, Mail, MapPin, Star, Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMember {
  name: string;
  title: string;
  photo: string;
  phone: string;
  email: string;
  featured?: boolean;
}

const team: TeamMember[] = [
  {
    name: 'Zach Smith',
    title: 'Owner',
    photo: '/IMG_1377.jpeg',
    phone: '706-728-6681',
    email: 'zachlsmith@att.net',
    featured: true,
  },
  {
    name: 'Chloe Smith',
    title: 'Marketing',
    photo: '/CE642125-84E8-4CD3-BFAB-2C0CE8119233.jpeg',
    phone: '706-728-5002',
    email: 'chloesmithuptownautosales@gmail.com',
  },
  {
    name: 'T Sproull',
    title: 'Sales',
    photo: '/IMG_5457.jpeg',
    phone: '770-546-5446',
    email: 'jtsproull@me.com',
  },
];

export default function MeetTheTeam() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-16">
          <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-3">Our People</p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-5">
            Meet The <span className="text-red-600">Team</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            The faces behind Uptown Auto Sales. We are a tight-knit team who genuinely care about
            helping our community get into great vehicles at fair prices.
          </p>
        </div>

        {/* Featured Owner */}
        <div className="mb-10">
          {team.filter(m => m.featured).map((member) => (
            <div
              key={member.name}
              className="relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-blue-700" />
              <div className="flex flex-col md:flex-row items-center gap-0">
                <div className="w-full md:w-80 flex-shrink-0 relative overflow-hidden" style={{ height: '420px' }}>
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white hidden md:block" />
                </div>
                <div className="flex-1 p-8 md:p-12 text-center md:text-left">
                  <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest rounded-full mb-4">
                    {member.title}
                  </span>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">{member.name}</h2>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    Leading Uptown Auto Sales with a commitment to honest deals, quality vehicles, and treating every customer like a neighbor.
                  </p>
                  <div className="space-y-3">
                    <a
                      href={`tel:${member.phone.replace(/-/g, '')}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors group justify-center md:justify-start"
                    >
                      <span className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0">
                        <Phone className="w-4 h-4" />
                      </span>
                      <span className="font-medium">{member.phone}</span>
                    </a>
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors group justify-center md:justify-start"
                    >
                      <span className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </span>
                      <span className="font-medium">{member.email}</span>
                    </a>
                    <div className="flex items-center gap-3 text-gray-500 justify-center md:justify-start">
                      <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span>Uptown Auto Sales — Rome, GA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rest of Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {team.filter(m => !m.featured).map((member) => (
            <div
              key={member.name}
              className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              <div className="relative overflow-hidden" style={{ height: '340px' }}>
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="inline-block px-2.5 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-full mb-2">
                    {member.title}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{member.name}</h3>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <a
                  href={`tel:${member.phone.replace(/-/g, '')}`}
                  className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors group/link"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 group-hover/link:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-sm">{member.phone}</span>
                </a>
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors group/link"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 group-hover/link:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-sm truncate">{member.email}</span>
                </a>
                <div className="flex items-center gap-3 text-gray-400">
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm">Uptown Auto Sales</span>
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
              { icon: Heart, label: 'Community', desc: 'Proudly rooted in Rome, Georgia and here to serve our neighbors.' },
              { icon: Users, label: 'No Pressure', desc: 'Real people, real answers. We work for you, not the commission.' },
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
