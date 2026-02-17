import { Shield, ShieldCheck, User, Wrench, Star, ClipboardList } from 'lucide-react';
import type { FenderVehicle } from '../lib/fenderApi';

interface CarfaxBadgesProps {
  vehicle: FenderVehicle;
  layout?: 'row' | 'grid';
}

interface Badge {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

function getCarfaxBadges(vehicle: FenderVehicle): Badge[] {
  const badges: Badge[] = [];

  if (vehicle.carfax_one_owner) {
    badges.push({
      label: '1-Owner',
      icon: <User className="w-3.5 h-3.5" />,
      colorClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/30',
    });
  }

  if (vehicle.carfax_no_accidents) {
    badges.push({
      label: 'No Accidents',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      colorClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/30',
    });
  } else if (vehicle.carfax_has_accident) {
    badges.push({
      label: 'Accident Reported',
      icon: <Shield className="w-3.5 h-3.5" />,
      colorClass: 'text-amber-300',
      bgClass: 'bg-amber-500/15',
      borderClass: 'border-amber-500/30',
    });
  }

  if (vehicle.carfax_great_reliability) {
    badges.push({
      label: 'Great Reliability',
      icon: <Star className="w-3.5 h-3.5" />,
      colorClass: 'text-blue-300',
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/30',
    });
  }

  if (vehicle.carfax_well_maintained) {
    badges.push({
      label: 'Well Maintained',
      icon: <Wrench className="w-3.5 h-3.5" />,
      colorClass: 'text-blue-300',
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/30',
    });
  }

  if (vehicle.carfax_service_records_count && vehicle.carfax_service_records_count > 0) {
    badges.push({
      label: `${vehicle.carfax_service_records_count} Service Record${vehicle.carfax_service_records_count !== 1 ? 's' : ''}`,
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      colorClass: 'text-sky-300',
      bgClass: 'bg-sky-500/15',
      borderClass: 'border-sky-500/30',
    });
  }

  if (vehicle.carfax_value_rating) {
    const rating = vehicle.carfax_value_rating.toLowerCase();
    const ratingLabel = rating === 'great' ? 'Great Value' : rating === 'good' ? 'Good Value' : 'Fair Value';
    const isGreat = rating === 'great';
    badges.push({
      label: ratingLabel,
      icon: <Star className="w-3.5 h-3.5" />,
      colorClass: isGreat ? 'text-yellow-300' : 'text-emerald-300',
      bgClass: isGreat ? 'bg-yellow-500/15' : 'bg-emerald-500/15',
      borderClass: isGreat ? 'border-yellow-500/30' : 'border-emerald-500/30',
    });
  }

  return badges;
}

export function CarfaxBadges({ vehicle, layout = 'row' }: CarfaxBadgesProps) {
  const badges = getCarfaxBadges(vehicle);
  if (badges.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${badge.bgClass} ${badge.borderClass} ${badge.colorClass}`}
          >
            {badge.icon}
            <span className="text-xs font-semibold">{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.bgClass} ${badge.borderClass} ${badge.colorClass}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CarfaxInlineBadges({ vehicle }: { vehicle: FenderVehicle }) {
  const badges = getCarfaxBadges(vehicle);
  if (badges.length === 0) return null;

  const shown = badges.slice(0, 3);
  const remaining = badges.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.bgClass} ${badge.borderClass} ${badge.colorClass}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400 text-[10px] font-semibold">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

export { getCarfaxBadges };
