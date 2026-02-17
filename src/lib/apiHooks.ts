import { useState, useEffect, useMemo } from 'react';
import { fenderApi } from './fenderApi';
import type { InventoryParams, FenderDealer, FenderVehicle, InventoryResponse } from './fenderApi';

const DEALER_CACHE_KEY = 'trinity_dealer_info';
const DEALER_CACHE_DURATION = 24 * 60 * 60 * 1000;

function getCachedDealer(): FenderDealer | null {
  try {
    const cached = localStorage.getItem(DEALER_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > DEALER_CACHE_DURATION) {
      localStorage.removeItem(DEALER_CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedDealer(dealer: FenderDealer): void {
  try {
    localStorage.setItem(DEALER_CACHE_KEY, JSON.stringify({
      data: dealer,
      timestamp: Date.now(),
    }));
  } catch {
  }
}

export function useDealer() {
  const cached = getCachedDealer();
  const [data, setData] = useState<FenderDealer | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDealer() {
      try {
        const dealer = await fenderApi.getDealer();
        if (!cancelled) {
          setCachedDealer(dealer);
          setData(dealer);
        }
      } catch (err) {
        if (!cancelled && !data) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDealer();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}

export function useInventory(params: InventoryParams = {}) {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedParams = useMemo(() => params, [
    params.limit,
    params.offset,
    params.sort,
    params.q,
    params.minPrice,
    params.maxPrice,
    params.minYear,
    params.maxYear,
  ]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    async function fetchInventory() {
      try {
        const response = await fenderApi.getInventory(memoizedParams);
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchInventory();

    return () => {
      cancelled = true;
    };
  }, [memoizedParams]);

  return { data, isLoading, error };
}

export function useVehicle(vehicleId: string | undefined) {
  const [data, setData] = useState<FenderVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(!!vehicleId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchVehicle() {
      try {
        const vehicle = await fenderApi.getVehicle(vehicleId);
        if (!cancelled) {
          setData(vehicle);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchVehicle();

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  return { data, isLoading, error };
}

export function usePreloadVehicles(vehicleIds: string[]) {
  return () => {
    vehicleIds.forEach(vehicleId => {
      fenderApi.getVehicle(vehicleId).catch(() => {});
    });
  };
}

export function usePreloadNextPage(params: InventoryParams) {
  return () => {
    const nextPageParams = {
      ...params,
      offset: (params.offset || 0) + (params.limit || 20),
    };
    fenderApi.getInventory(nextPageParams).catch(() => {});
  };
}
