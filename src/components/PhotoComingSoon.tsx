import { Camera } from 'lucide-react';

interface PhotoComingSoonProps {
  aspectRatio?: string;
  className?: string;
}

export function PhotoComingSoon({ aspectRatio = 'aspect-[16/10]', className = '' }: PhotoComingSoonProps) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${aspectRatio} ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl scale-150" />
          <div className="relative w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-gray-500" strokeWidth={1.5} />
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Photo Coming Soon</p>
      </div>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 3s infinite',
        }}
      />
    </div>
  );
}
