import { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  author_name: string;
  rating: number;
  review_text: string;
  review_date: string;
}

function StarRow({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-red-600',
  'bg-blue-900',
  'bg-red-700',
  'bg-blue-800',
  'bg-red-800',
  'bg-blue-900',
];

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_featured', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent"></div>
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const featured = reviews[0];
  const rest = reviews.slice(1);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600 mb-3">
            Real Stories, Real People
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">
            Proudly Serving <span className="text-red-600">Our Community</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-2xl font-bold text-gray-900">4.4</span>
            <span className="text-gray-500 text-sm">Google Rating</span>
          </div>
          <div className="h-1 w-24 bg-red-600 mx-auto"></div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="h-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-8 flex flex-col justify-between text-white shadow-xl">
              <Quote className="w-12 h-12 text-blue-400 mb-6" />
              <div className="flex-1">
                <StarRow rating={featured.rating} size="lg" />
                <p className="mt-5 text-lg leading-relaxed text-blue-50 font-light">
                  "{featured.review_text}"
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-blue-700 pt-6">
                <div className={`w-12 h-12 rounded-full ${AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {getInitials(featured.author_name)}
                </div>
                <div>
                  <p className="font-semibold text-white">{featured.author_name}</p>
                  <p className="text-blue-300 text-sm">Google Review</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid sm:grid-cols-2 gap-5">
            {rest.map((review, idx) => (
              <div
                key={review.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-red-200 hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <StarRow rating={review.rating} size="sm" />
                <p className="mt-3 text-gray-600 text-sm leading-relaxed flex-1 line-clamp-4">
                  "{review.review_text}"
                </p>
                <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {getInitials(review.author_name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.author_name}</p>
                    <p className="text-gray-400 text-xs">Google Review</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <a
            href="https://share.google/35bZkeh3VVLn6TjeQ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Read All Reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}
