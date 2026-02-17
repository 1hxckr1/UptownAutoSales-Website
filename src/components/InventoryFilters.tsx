import { useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { InventoryFilters, FEATURE_MAP } from '../lib/filterHelpers';

interface InventoryFiltersProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
  vehicles: any[];
  className?: string;
}

export function InventoryFiltersPanel({ filters, onChange, vehicles, className = '' }: InventoryFiltersProps) {
  const inventoryStats = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 100000,
        minMileage: 0,
        maxMileage: 200000,
        minYear: new Date().getFullYear() - 20,
        maxYear: new Date().getFullYear(),
        makes: [],
        models: [],
        bodyStyles: [],
        transmissions: [],
        drivetrains: [],
        fuelTypes: [],
      };
    }

    const makes = [...new Set(vehicles.map(v => v.make))].filter(Boolean).sort();
    const models = filters.make
      ? [...new Set(vehicles.filter(v => v.make === filters.make).map(v => v.model))].filter(Boolean).sort()
      : [];
    const bodyStyles = [...new Set(vehicles.map(v => v.body_style))].filter(Boolean).sort();
    const transmissions = [...new Set(vehicles.map(v => v.transmission))].filter(Boolean).sort();
    const drivetrains = [...new Set(vehicles.map(v => v.drivetrain))].filter(Boolean).sort();
    const fuelTypes = [...new Set(vehicles.map(v => v.fuel_type))].filter(Boolean).sort();

    return {
      minPrice: Math.min(...vehicles.map(v => v.asking_price || 0)),
      maxPrice: Math.max(...vehicles.map(v => v.asking_price || 0)),
      minMileage: Math.min(...vehicles.map(v => v.mileage || 0)),
      maxMileage: Math.max(...vehicles.map(v => v.mileage || 0)),
      minYear: Math.min(...vehicles.map(v => v.year || 0)),
      maxYear: Math.max(...vehicles.map(v => v.year || 0)),
      makes,
      models,
      bodyStyles,
      transmissions,
      drivetrains,
      fuelTypes,
    };
  }, [vehicles, filters.make]);

  const updateFilter = (key: keyof InventoryFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };

    if (key === 'make') {
      newFilters.model = '';
    }

    onChange(newFilters);
  };

  const toggleFeature = (feature: string) => {
    const newFeatures = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature];

    updateFilter('features', newFeatures);
  };

  const availableFeatures = Object.keys(FEATURE_MAP);

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Popular Features
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {availableFeatures.map(feature => (
            <label
              key={feature}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all group"
            >
              <input
                type="checkbox"
                checked={filters.features.includes(feature)}
                onChange={() => toggleFeature(feature)}
                className="hidden"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                filters.features.includes(feature)
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-white/20 group-hover:border-white/40'
              }`}>
                {filters.features.includes(feature) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                {feature}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Price Range
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min</label>
            <input
              type="number"
              placeholder={`$${inventoryStats.minPrice.toLocaleString()}`}
              value={filters.priceMin ?? ''}
              onChange={(e) => updateFilter('priceMin', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max</label>
            <input
              type="number"
              placeholder={`$${inventoryStats.maxPrice.toLocaleString()}`}
              value={filters.priceMax ?? ''}
              onChange={(e) => updateFilter('priceMax', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Mileage Range
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min</label>
            <input
              type="number"
              placeholder={`${inventoryStats.minMileage.toLocaleString()}`}
              value={filters.milesMin ?? ''}
              onChange={(e) => updateFilter('milesMin', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max</label>
            <input
              type="number"
              placeholder={`${inventoryStats.maxMileage.toLocaleString()}`}
              value={filters.milesMax ?? ''}
              onChange={(e) => updateFilter('milesMax', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Year Range
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min</label>
            <input
              type="number"
              placeholder={`${inventoryStats.minYear}`}
              value={filters.yearMin ?? ''}
              onChange={(e) => updateFilter('yearMin', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max</label>
            <input
              type="number"
              placeholder={`${inventoryStats.maxYear}`}
              value={filters.yearMax ?? ''}
              onChange={(e) => updateFilter('yearMax', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Make & Model
        </h3>
        <div className="space-y-3">
          <select
            value={filters.make}
            onChange={(e) => updateFilter('make', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="" className="bg-gray-900 text-white">All Makes</option>
            {inventoryStats.makes.map(make => (
              <option key={make} value={make} className="bg-gray-900 text-white">{make}</option>
            ))}
          </select>
          <select
            value={filters.model}
            onChange={(e) => updateFilter('model', e.target.value)}
            disabled={!filters.make}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-gray-900 text-white">All Models</option>
            {inventoryStats.models.map(model => (
              <option key={model} value={model} className="bg-gray-900 text-white">{model}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Body Style
        </h3>
        <select
          value={filters.bodyStyle}
          onChange={(e) => updateFilter('bodyStyle', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-gray-900 text-white">All Body Styles</option>
          {inventoryStats.bodyStyles.map(style => (
            <option key={style} value={style} className="bg-gray-900 text-white">{style}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Transmission
        </h3>
        <select
          value={filters.transmission}
          onChange={(e) => updateFilter('transmission', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-gray-900 text-white">All Transmissions</option>
          {inventoryStats.transmissions.map(trans => (
            <option key={trans} value={trans} className="bg-gray-900 text-white">{trans}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Drivetrain
        </h3>
        <select
          value={filters.drivetrain}
          onChange={(e) => updateFilter('drivetrain', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-gray-900 text-white">All Drivetrains</option>
          {inventoryStats.drivetrains.map(drive => (
            <option key={drive} value={drive} className="bg-gray-900 text-white">{drive}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Fuel Type
        </h3>
        <select
          value={filters.fuelType}
          onChange={(e) => updateFilter('fuelType', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="" className="bg-gray-900 text-white">All Fuel Types</option>
          {inventoryStats.fuelTypes.map(fuel => (
            <option key={fuel} value={fuel} className="bg-gray-900 text-white">{fuel}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Sort By
        </h3>
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="newest" className="bg-gray-900 text-white">Newest First</option>
          <option value="price_asc" className="bg-gray-900 text-white">Price: Low to High</option>
          <option value="price_desc" className="bg-gray-900 text-white">Price: High to Low</option>
          <option value="year_desc" className="bg-gray-900 text-white">Year: Newest</option>
          <option value="mileage_asc" className="bg-gray-900 text-white">Mileage: Lowest</option>
        </select>
      </div>
    </div>
  );
}

interface FilterChipsProps {
  filters: InventoryFilters;
  onRemove: (key: keyof InventoryFilters, value?: any) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const chips: Array<{ label: string; key: keyof InventoryFilters; value?: any }> = [];

  if (filters.search) {
    chips.push({ label: `Search: ${filters.search}`, key: 'search' });
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const min = filters.priceMin !== null ? `$${filters.priceMin.toLocaleString()}` : 'Any';
    const max = filters.priceMax !== null ? `$${filters.priceMax.toLocaleString()}` : 'Any';
    chips.push({ label: `Price: ${min} - ${max}`, key: 'priceMin' });
  }
  if (filters.milesMin !== null || filters.milesMax !== null) {
    const min = filters.milesMin !== null ? filters.milesMin.toLocaleString() : 'Any';
    const max = filters.milesMax !== null ? filters.milesMax.toLocaleString() : 'Any';
    chips.push({ label: `Miles: ${min} - ${max}`, key: 'milesMin' });
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    const min = filters.yearMin !== null ? filters.yearMin : 'Any';
    const max = filters.yearMax !== null ? filters.yearMax : 'Any';
    chips.push({ label: `Year: ${min} - ${max}`, key: 'yearMin' });
  }
  if (filters.make) {
    chips.push({ label: `Make: ${filters.make}`, key: 'make' });
  }
  if (filters.model) {
    chips.push({ label: `Model: ${filters.model}`, key: 'model' });
  }
  if (filters.bodyStyle) {
    chips.push({ label: `Body: ${filters.bodyStyle}`, key: 'bodyStyle' });
  }
  if (filters.transmission) {
    chips.push({ label: `Trans: ${filters.transmission}`, key: 'transmission' });
  }
  if (filters.drivetrain) {
    chips.push({ label: `Drive: ${filters.drivetrain}`, key: 'drivetrain' });
  }
  if (filters.fuelType) {
    chips.push({ label: `Fuel: ${filters.fuelType}`, key: 'fuelType' });
  }
  filters.features.forEach(feature => {
    chips.push({ label: feature, key: 'features', value: feature });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip, index) => (
        <button
          key={`${chip.key}-${index}`}
          onClick={() => onRemove(chip.key, chip.value)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-600/30 transition-all"
        >
          <span>{chip.label}</span>
          <X className="w-3.5 h-3.5" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-600/30 transition-all"
      >
        <span>Clear All</span>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
