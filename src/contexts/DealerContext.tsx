import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDealer as useDealerQuery } from '../lib/apiHooks';
import type { FenderDealer } from '../lib/fenderApi';

interface DealerContextType {
  dealer: FenderDealer | null;
  loading: boolean;
  error: string | null;
}

const DealerContext = createContext<DealerContextType | undefined>(undefined);

export function DealerProvider({ children }: { children: ReactNode }) {
  const { data: dealer, isLoading: loading, error: queryError } = useDealerQuery();

  useEffect(() => {
    if (dealer?.primary_color) {
      document.documentElement.style.setProperty('--dealer-primary-color', dealer.primary_color);
    }
  }, [dealer]);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load dealer information') : null;

  return (
    <DealerContext.Provider value={{ dealer: dealer || null, loading, error }}>
      {children}
    </DealerContext.Provider>
  );
}

export function useDealer() {
  const context = useContext(DealerContext);
  if (context === undefined) {
    throw new Error('useDealer must be used within a DealerProvider');
  }
  return context;
}
