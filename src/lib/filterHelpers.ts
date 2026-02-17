export const FEATURE_MAP: Record<string, string[]> = {
  'Backup Camera': ['backup camera', 'rear view camera', 'rearview camera', 'reverse camera'],
  'Apple CarPlay': ['apple carplay', 'carplay', 'apple car play'],
  'Android Auto': ['android auto'],
  'Bluetooth': ['bluetooth', 'bluetooth connectivity'],
  'Navigation': ['navigation', 'navigation system', 'gps', 'nav system'],
  'Heated Seats': ['heated seats', 'heated front seats', 'seat heaters'],
  'Leather Seats': ['leather', 'leather seats', 'leather interior'],
  'Sunroof': ['sunroof', 'moonroof', 'panoramic sunroof', 'panoramic roof'],
  'Remote Start': ['remote start', 'remote starter'],
  'Keyless Entry': ['keyless entry', 'push button start', 'push start', 'keyless ignition'],
  'Third Row': ['third row', '3rd row', 'third row seating', '7 passenger', '8 passenger'],
  'Blind Spot Monitor': ['blind spot', 'blind spot monitor', 'blind spot warning', 'bsm'],
  'Lane Keep Assist': ['lane keep', 'lane departure', 'lane assist', 'lane keeping'],
  'Adaptive Cruise': ['adaptive cruise', 'adaptive cruise control', 'acc'],
  'Parking Sensors': ['parking sensors', 'park assist', 'parking assist'],
  'AWD': ['awd', '4wd', 'all wheel drive', 'four wheel drive', '4x4'],
};

export function normalizeFeature(feature: string): string {
  const lowerFeature = feature.toLowerCase().trim();

  for (const [canonical, aliases] of Object.entries(FEATURE_MAP)) {
    if (aliases.includes(lowerFeature)) {
      return canonical;
    }
  }

  return feature;
}

export function normalizeFeatures(features: string[]): string[] {
  if (!Array.isArray(features)) return [];

  const normalized = features.map(f => normalizeFeature(f));
  return [...new Set(normalized)];
}

export function vehicleHasFeature(vehicle: any, featureName: string): boolean {
  const features = vehicle.features || [];
  const aiFeatures = vehicle.ai_detected_features || [];

  const allFeatures = [
    ...features,
    ...(Array.isArray(aiFeatures) ? aiFeatures : []),
  ];

  const normalized = normalizeFeatures(allFeatures);
  return normalized.includes(featureName);
}

export interface InventoryFilters {
  search: string;
  priceMin: number | null;
  priceMax: number | null;
  milesMin: number | null;
  milesMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  make: string;
  model: string;
  bodyStyle: string;
  transmission: string;
  drivetrain: string;
  fuelType: string;
  features: string[];
  sort: string;
}

export function getDefaultFilters(): InventoryFilters {
  return {
    search: '',
    priceMin: null,
    priceMax: null,
    milesMin: null,
    milesMax: null,
    yearMin: null,
    yearMax: null,
    make: '',
    model: '',
    bodyStyle: '',
    transmission: '',
    drivetrain: '',
    fuelType: '',
    features: [],
    sort: 'price_desc',
  };
}

export function filtersToQueryString(filters: InventoryFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('q', filters.search);
  if (filters.priceMin !== null) params.set('priceMin', String(filters.priceMin));
  if (filters.priceMax !== null) params.set('priceMax', String(filters.priceMax));
  if (filters.milesMin !== null) params.set('milesMin', String(filters.milesMin));
  if (filters.milesMax !== null) params.set('milesMax', String(filters.milesMax));
  if (filters.yearMin !== null) params.set('yearMin', String(filters.yearMin));
  if (filters.yearMax !== null) params.set('yearMax', String(filters.yearMax));
  if (filters.make) params.set('make', filters.make);
  if (filters.model) params.set('model', filters.model);
  if (filters.bodyStyle) params.set('body', filters.bodyStyle);
  if (filters.transmission) params.set('trans', filters.transmission);
  if (filters.drivetrain) params.set('drive', filters.drivetrain);
  if (filters.fuelType) params.set('fuel', filters.fuelType);
  if (filters.features.length > 0) params.set('features', filters.features.join(','));
  if (filters.sort !== 'price_desc') params.set('sort', filters.sort);

  return params.toString();
}

export function queryStringToFilters(search: string): InventoryFilters {
  const params = new URLSearchParams(search);

  return {
    search: params.get('q') || '',
    priceMin: params.has('priceMin') ? Number(params.get('priceMin')) : null,
    priceMax: params.has('priceMax') ? Number(params.get('priceMax')) : null,
    milesMin: params.has('milesMin') ? Number(params.get('milesMin')) : null,
    milesMax: params.has('milesMax') ? Number(params.get('milesMax')) : null,
    yearMin: params.has('yearMin') ? Number(params.get('yearMin')) : null,
    yearMax: params.has('yearMax') ? Number(params.get('yearMax')) : null,
    make: params.get('make') || '',
    model: params.get('model') || '',
    bodyStyle: params.get('body') || '',
    transmission: params.get('trans') || '',
    drivetrain: params.get('drive') || '',
    fuelType: params.get('fuel') || '',
    features: params.get('features') ? params.get('features')!.split(',') : [],
    sort: params.get('sort') || 'price_desc',
  };
}

export function applyFilters(vehicles: any[], filters: InventoryFilters): any[] {
  return vehicles.filter(vehicle => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim();
      const normalizedSearch = searchLower.replace(/[^a-z0-9]/g, '');

      const searchableText = [
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.vin,
        vehicle.stock_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const normalizedVehicleText = searchableText.replace(/[^a-z0-9]/g, '');

      const matchesRaw = searchableText.includes(searchLower);
      const matchesNormalized = normalizedVehicleText.includes(normalizedSearch);

      if (!matchesRaw && !matchesNormalized) return false;
    }

    if (filters.priceMin !== null && vehicle.asking_price && vehicle.asking_price > 0) {
      if (vehicle.asking_price < filters.priceMin) return false;
    }
    if (filters.priceMax !== null && vehicle.asking_price && vehicle.asking_price > 0) {
      if (vehicle.asking_price > filters.priceMax) return false;
    }

    if (filters.milesMin !== null && vehicle.mileage && vehicle.mileage > 0) {
      if (vehicle.mileage < filters.milesMin) return false;
    }
    if (filters.milesMax !== null && vehicle.mileage && vehicle.mileage > 0) {
      if (vehicle.mileage > filters.milesMax) return false;
    }

    if (filters.yearMin !== null && vehicle.year && vehicle.year > 0) {
      if (vehicle.year < filters.yearMin) return false;
    }
    if (filters.yearMax !== null && vehicle.year && vehicle.year > 0) {
      if (vehicle.year > filters.yearMax) return false;
    }

    if (filters.make && vehicle.make !== filters.make) return false;
    if (filters.model && vehicle.model !== filters.model) return false;
    if (filters.bodyStyle && vehicle.body_style !== filters.bodyStyle) return false;
    if (filters.transmission && vehicle.transmission !== filters.transmission) return false;
    if (filters.drivetrain && vehicle.drivetrain !== filters.drivetrain) return false;
    if (filters.fuelType && vehicle.fuel_type !== filters.fuelType) return false;

    if (filters.features.length > 0) {
      const hasAllFeatures = filters.features.every(feature =>
        vehicleHasFeature(vehicle, feature)
      );
      if (!hasAllFeatures) return false;
    }

    return true;
  });
}

export function sortVehicles(vehicles: any[], sortOption: string): any[] {
  const sorted = [...vehicles];

  switch (sortOption) {
    case 'price_asc':
      return sorted.sort((a, b) => a.asking_price - b.asking_price);
    case 'price_desc':
      return sorted.sort((a, b) => b.asking_price - a.asking_price);
    case 'year_desc':
      return sorted.sort((a, b) => b.year - a.year);
    case 'mileage_asc':
      return sorted.sort((a, b) => a.mileage - b.mileage);
    case 'newest':
    default:
      return sorted.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export function getActiveFilterCount(filters: InventoryFilters): number {
  let count = 0;

  if (filters.search) count++;
  if (filters.priceMin !== null || filters.priceMax !== null) count++;
  if (filters.milesMin !== null || filters.milesMax !== null) count++;
  if (filters.yearMin !== null || filters.yearMax !== null) count++;
  if (filters.make) count++;
  if (filters.model) count++;
  if (filters.bodyStyle) count++;
  if (filters.transmission) count++;
  if (filters.drivetrain) count++;
  if (filters.fuelType) count++;
  if (filters.features.length > 0) count += filters.features.length;

  return count;
}
