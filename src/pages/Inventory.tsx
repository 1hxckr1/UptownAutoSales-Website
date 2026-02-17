import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { useInventory, usePreloadVehicles } from '../lib/apiHooks';
import { VehicleCardCarousel } from '../components/VehicleCardCarousel';
import { isValidVin, getCarfaxUrl } from '../lib/carfax';
import { CarfaxInlineBadges } from '../components/CarfaxBadges';
import { InventoryFiltersPanel, FilterChips } from '../components/InventoryFilters';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  getDefaultFilters,
  queryStringToFilters,
  filtersToQueryString,
  applyFilters,
  sortVehicles,
  getActiveFilterCount,
  type InventoryFilters,
} from '../lib/filterHelpers';

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  const { track } = useAnalytics();
  const trackedListView = useRef(false);

  const [filters, setFilters] = useState<InventoryFilters>(() => {
    return queryStringToFilters(searchParams.toString());
  });

  const { data, isLoading: loading, error: queryError } = useInventory({ limit: 1000 });
  const preloadVehicles = usePreloadVehicles(data?.vehicles.map(v => v.id) || []);

  const allVehicles = data?.vehicles || [];

  useEffect(() => {
    if (!loading && data && !trackedListView.current) {
      trackedListView.current = true;
      track('inventory_list_view', {
        total_vehicles: data.vehicles.length,
        active_filters: getActiveFilterCount(filters),
      });
    }
  }, [loading, data, filters, track]);

  useEffect(() => {
    const newQueryString = filtersToQueryString(filters);
    setSearchParams(newQueryString, { replace: true });
    setPage(1);
  }, [filters, setSearchParams]);

  useEffect(() => {
    const handlePopState = () => {
      setFilters(queryStringToFilters(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const filteredVehicles = useMemo(() => {
    const filtered = applyFilters(allVehicles, filters);
    return sortVehicles(filtered, filters.sort);
  }, [allVehicles, filters]);

  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredVehicles.slice(start, start + limit);
  }, [filteredVehicles, page, limit]);

  const total = filteredVehicles.length;
  const totalPages = Math.ceil(total / limit);
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load inventory') : null;
  const activeFilterCount = getActiveFilterCount(filters);

  const clearFilters = () => {
    setFilters(getDefaultFilters());
    setPage(1);
  };

  const removeFilter = (key: keyof InventoryFilters, value?: any) => {
    const newFilters = { ...filters };

    if (key === 'features' && value) {
      newFilters.features = newFilters.features.filter(f => f !== value);
    } else if (key === 'priceMin' || key === 'priceMax') {
      newFilters.priceMin = null;
      newFilters.priceMax = null;
    } else if (key === 'milesMin' || key === 'milesMax') {
      newFilters.milesMin = null;
      newFilters.milesMax = null;
    } else if (key === 'yearMin' || key === 'yearMax') {
      newFilters.yearMin = null;
      newFilters.yearMax = null;
    } else if (key === 'search') {
      newFilters.search = '';
    } else {
      newFilters[key] = '' as any;
    }

    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Our <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Inventory</span>
          </h1>
          <p className="text-gray-400 text-lg">
            {loading ? 'Loading...' : `${total} vehicle${total !== 1 ? 's' : ''} available`}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <InventoryFiltersPanel
                filters={filters}
                onChange={setFilters}
                vehicles={allVehicles}
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full mt-6 px-4 py-3 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 transition-all font-semibold"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </aside>

          <div className="lg:hidden mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by make, model, trim, VIN, or stock #..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="relative px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center"
              >
                <SlidersHorizontal className="w-5 h-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <main>
            <div className="hidden lg:block mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by make, model, trim, VIN, or stock #..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-6">
                <FilterChips
                  filters={filters}
                  onRemove={removeFilter}
                  onClearAll={clearFilters}
                />
              </div>
            )}

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading vehicles...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 text-lg">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : paginatedVehicles.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No vehicles match your filters.</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedVehicles.map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  className="group relative bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <Link
                    to={`/inventory/${vehicle.slug || vehicle.id}`}
                    className="block"
                    onMouseEnter={() => {
                      preloadVehicles();
                    }}
                  >
                    <VehicleCardCarousel
                      photoUrls={vehicle.photo_urls?.length > 0 ? vehicle.photo_urls : vehicle.primary_photo_url ? [vehicle.primary_photo_url] : []}
                      photoCount={vehicle.photo_count}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      aspectRatio="aspect-[4/3]"
                      priority={index < 6}
                      className="group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {vehicle.year > 0 ? vehicle.year : ''} {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.trim && <p className="text-gray-400 text-sm mb-1">{vehicle.trim}</p>}
                      {vehicle.color && (
                        <p className="text-gray-500 text-xs mb-2">{vehicle.color}</p>
                      )}
                      <div className="mb-3">
                        <CarfaxInlineBadges vehicle={vehicle} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          {vehicle.compare_price && vehicle.compare_price > 0 && (
                            <div className="text-gray-500 text-xs line-through mb-0.5">
                              Market Value: ${vehicle.compare_price.toLocaleString()}
                            </div>
                          )}
                          {vehicle.asking_price && vehicle.asking_price > 0 ? (
                            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                              ${vehicle.asking_price.toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-blue-400">
                              Call for Price
                            </div>
                          )}
                          {vehicle.mileage && vehicle.mileage > 0 && (
                            <div className="text-gray-500 text-sm">{vehicle.mileage.toLocaleString()} mi</div>
                          )}
                        </div>
                        <div className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                          View Details
                        </div>
                      </div>

                      {(vehicle.fuel_type || vehicle.transmission || vehicle.drivetrain) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {vehicle.fuel_type && (
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-200 text-xs border border-white/15">
                              {vehicle.fuel_type}
                            </span>
                          )}
                          {vehicle.transmission && (
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-200 text-xs border border-white/15">
                              {vehicle.transmission}
                            </span>
                          )}
                          {vehicle.drivetrain && (
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-200 text-xs border border-white/15">
                              {vehicle.drivetrain}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="px-6 pb-6">
                    {isValidVin(vehicle) ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = getCarfaxUrl(vehicle);
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 text-orange-300 hover:from-orange-500/30 hover:to-orange-600/30 hover:border-orange-400/50 transition-all group"
                      >
                        <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold">View CARFAX Report</span>
                      </button>
                    ) : (
                      <div className="relative group">
                        <button
                          disabled
                          className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-500 font-medium cursor-not-allowed"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="font-semibold">CARFAX Report</span>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          CARFAX not available (VIN missing)
                        </div>
                      </div>
                    )}
                  </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center space-x-4">
                    <button
                      onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span>Previous</span>
                    </button>

                    <div className="text-gray-400">
                      Page {page} of {totalPages}
                    </div>

                    <button
                      onClick={() => {
                        setPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-gradient-to-b from-gray-900 to-black rounded-t-3xl border-t border-white/10 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <InventoryFiltersPanel
                filters={filters}
                onChange={setFilters}
                vehicles={allVehicles}
              />
            </div>
            <div className="p-6 border-t border-white/10 bg-black/50 space-y-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    clearFilters();
                    setShowMobileFilters(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 transition-all font-semibold"
                >
                  Clear All Filters
                </button>
              )}
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all font-semibold"
              >
                Show {total} Vehicle{total !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
