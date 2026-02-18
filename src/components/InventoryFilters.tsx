import { useMemo } from 'react';
import { X, Check, SlidersHorizontal } from 'lucide-react';
import { InventoryFilters, FEATURE_MAP } from '../lib/filterHelpers';

interface InventoryFiltersProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
  vehicles: any[];
  className?: string;
  onClearAll?: () => void;
  activeFilterCount?: number;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-bold text-[#1a2a4a] uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-[#1a2a4a] focus:ring-1 focus:ring-[#1a2a4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function NumberRangeField({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
}: {
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Min</label>
        <input
          type="number"
          placeholder={minPlaceholder}
          value={minValue ?? ''}
          onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1a2a4a] focus:ring-1 focus:ring-[#1a2a4a] transition-colors"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Max</label>
        <input
          type="number"
          placeholder={maxPlaceholder}
          value={maxValue ?? ''}
          onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1a2a4a] focus:ring-1 focus:ring-[#1a2a4a] transition-colors"
        />
      </div>
    </div>
  );
}

export function InventoryFiltersPanel({
  filters,
  onChange,
  vehicles,
  className = '',
  onClearAll,
  activeFilterCount = 0,
}: InventoryFiltersProps) {
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

      {/* Panel header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#1a2a4a]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#1a2a4a]" />
          <div>
            <h2 className="text-base font-bold text-[#1a2a4a] leading-tight">Filter Center</h2>
            <p className="text-[10px] text-gray-400 leading-tight">Narrow down your perfect ride</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#1a2a4a] text-white text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
          {onClearAll && activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-1 rounded-full border border-red-600 text-red-600 text-xs font-semibold hover:bg-red-600 hover:text-white transition-all"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Section: Quick Picks */}
      <div>
        <SectionHeader title="Quick Picks" />
        <div className="flex flex-wrap gap-2">
          {availableFeatures.map(feature => {
            const selected = filters.features.includes(feature);
            return (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selected
                    ? 'bg-[#1a2a4a] text-white border-red-500 shadow-sm'
                    : 'bg-white text-[#1a2a4a] border-gray-300 hover:bg-blue-50 hover:border-[#1a2a4a]'
                }`}
              >
                {selected && <Check className="w-3 h-3 flex-shrink-0" />}
                {feature}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section: Make & Model */}
      <div>
        <SectionHeader title="Make & Model" />
        <div className="space-y-2">
          <SelectField
            value={filters.make}
            onChange={(v) => updateFilter('make', v)}
            options={inventoryStats.makes}
            placeholder="All Makes"
          />
          <SelectField
            value={filters.model}
            onChange={(v) => updateFilter('model', v)}
            options={inventoryStats.models}
            placeholder="All Models"
            disabled={!filters.make}
          />
        </div>
      </div>

      {/* Section: Vehicle Details */}
      <div>
        <SectionHeader title="Vehicle Details" />
        <div className="space-y-2">
          <SelectField
            value={filters.bodyStyle}
            onChange={(v) => updateFilter('bodyStyle', v)}
            options={inventoryStats.bodyStyles}
            placeholder="All Body Styles"
          />
          <SelectField
            value={filters.transmission}
            onChange={(v) => updateFilter('transmission', v)}
            options={inventoryStats.transmissions}
            placeholder="All Transmissions"
          />
          <SelectField
            value={filters.drivetrain}
            onChange={(v) => updateFilter('drivetrain', v)}
            options={inventoryStats.drivetrains}
            placeholder="All Drivetrains"
          />
          <SelectField
            value={filters.fuelType}
            onChange={(v) => updateFilter('fuelType', v)}
            options={inventoryStats.fuelTypes}
            placeholder="All Fuel Types"
          />
        </div>
      </div>

      {/* Section: Price & Mileage */}
      <div>
        <SectionHeader title="Price & Mileage" />
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Price Range</p>
            <NumberRangeField
              minValue={filters.priceMin}
              maxValue={filters.priceMax}
              onMinChange={(v) => updateFilter('priceMin', v)}
              onMaxChange={(v) => updateFilter('priceMax', v)}
              minPlaceholder={`$${inventoryStats.minPrice.toLocaleString()}`}
              maxPlaceholder={`$${inventoryStats.maxPrice.toLocaleString()}`}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mileage Range</p>
            <NumberRangeField
              minValue={filters.milesMin}
              maxValue={filters.milesMax}
              onMinChange={(v) => updateFilter('milesMin', v)}
              onMaxChange={(v) => updateFilter('milesMax', v)}
              minPlaceholder={`${inventoryStats.minMileage.toLocaleString()}`}
              maxPlaceholder={`${inventoryStats.maxMileage.toLocaleString()}`}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year Range</p>
            <NumberRangeField
              minValue={filters.yearMin}
              maxValue={filters.yearMax}
              onMinChange={(v) => updateFilter('yearMin', v)}
              onMaxChange={(v) => updateFilter('yearMax', v)}
              minPlaceholder={`${inventoryStats.minYear}`}
              maxPlaceholder={`${inventoryStats.maxYear}`}
            />
          </div>
        </div>
      </div>

      {/* Section: Sorting */}
      <div>
        <SectionHeader title="Sorting" />
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-[#1a2a4a] focus:ring-1 focus:ring-[#1a2a4a] transition-colors"
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="year_desc">Year: Newest</option>
          <option value="mileage_asc">Mileage: Lowest</option>
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
    chips.push({ label: `Price: ${min} – ${max}`, key: 'priceMin' });
  }
  if (filters.milesMin !== null || filters.milesMax !== null) {
    const min = filters.milesMin !== null ? filters.milesMin.toLocaleString() : 'Any';
    const max = filters.milesMax !== null ? filters.milesMax.toLocaleString() : 'Any';
    chips.push({ label: `Miles: ${min} – ${max}`, key: 'milesMin' });
  }
  if (filters.yearMin !== null || filters.yearMax !== null) {
    const min = filters.yearMin !== null ? filters.yearMin : 'Any';
    const max = filters.yearMax !== null ? filters.yearMax : 'Any';
    chips.push({ label: `Year: ${min} – ${max}`, key: 'yearMin' });
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eef1f8] border border-[#c5cfe8] text-[#1a2a4a] text-xs font-semibold hover:bg-[#dce3f4] transition-all"
        >
          <span>{chip.label}</span>
          <X className="w-3 h-3 text-red-500 flex-shrink-0" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
      >
        <span>Clear All</span>
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
