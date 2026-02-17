// ✅ REPLACE your entire file with this
// (same path/file you pasted from — this becomes the new full contents)

import { supabase } from './supabase';

interface FenderDealer {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  zip_code: string;
  email: string;
  website_url: string;
  logo_url: string;
  primary_color: string;
}

interface MediaItem {
  url: string;
  media_type: 'photo' | 'video';
  thumbnail_url?: string;
  caption?: string;
  duration?: number;
  display_order: number;
}

interface AIDetectedFeatures {
  confirmed: string[];
  suggested: string[];
}

interface FenderVehicle {
  id: string;
  slug: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  asking_price: number;
  compare_price?: number;
  mileage: number;
  color: string;
  exterior_color?: string;
  interior_color: string;
  drivetrain: string;
  transmission: string;
  fuel_type: string;
  body_style: string;
  engine?: string;
  engine_type?: string;
  description: string;
  primary_photo_url: string;
  photo_urls: string[];
  photo_count?: number;
  video_urls?: string[];
  media?: MediaItem[];
  vin: string;
  stock_number?: string;
  notes?: string;
  features?: string[];
  ai_detected_features?: AIDetectedFeatures;
  carfax_report_url?: string | null;
  carfax_one_owner?: boolean;
  carfax_no_accidents?: boolean;
  carfax_has_accident?: boolean;
  carfax_well_maintained?: boolean;
  carfax_great_reliability?: boolean;
  carfax_service_records_count?: number;
  carfax_value_rating?: string | null;
  mpg?: {
    city?: number;
    highway?: number;
  };
}

interface InventoryParams {
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface InventoryResponse {
  vehicles: FenderVehicle[];
  pagination: PaginationInfo;
  total: number;
  limit: number;
  offset: number;
}

interface VehicleInterestPayload {
  source_type?: 'inventory' | 'manual' | null;
  vehicle_id?: string | null;
  vin?: string | null;
  stock_number?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  price?: number | null;
  mileage?: number | null;
  vehicle_url?: string | null;
  location_id?: string | null;
}

interface FormSubmission {
  type: 'contact' | 'lead' | 'credit_application' | 'trade_inquiry';
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  vehicle_interest?: string | VehicleInterestPayload | null;
  vehicle_interest_provided?: boolean;
  submission_schema_version?: string;
  salesperson_name?: string | null;
  preferred_down_payment?: number | null;

  // ✅ honeypot anti-spam (your forms should include this hidden field and leave it blank)
  hp?: string;

  [key: string]: any;
}

interface FormSubmissionResponse {
  success: boolean;
  lead_id?: string;
  dealer_id?: string;
  submission_id?: string;
  timestamp?: string;
  sms_opt_in_recorded?: boolean;
  message?: string;
  error?: string;
  error_code?: string;
}

type ImageSize = 'thumbnail' | 'card_mobile' | 'card' | 'large' | 'full';

const IMAGE_TRANSFORM_PARAMS: Record<ImageSize, string> = {
  thumbnail: 'width=400&height=300&resize=cover&quality=75',
  card_mobile: 'width=480&height=360&resize=cover&quality=75',
  card: 'width=800&height=600&resize=cover&quality=80',
  large: 'width=1200&height=900&resize=cover&quality=85',
  full: 'width=1920&height=1440&resize=contain&quality=90',
};

export function getOptimizedImageUrl(url: string, size: ImageSize = 'card'): string {
  if (!url) return url;

  const isSupabaseStorage = url.includes('supabase.co/storage');
  if (!isSupabaseStorage) return url;

  let transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const qIndex = transformUrl.indexOf('?');
  if (qIndex !== -1) {
    transformUrl = transformUrl.substring(0, qIndex);
  }

  return `${transformUrl}?${IMAGE_TRANSFORM_PARAMS[size]}`;
}

function safeJsonErrorMessage(err: any): string {
  if (!err) return 'Request failed';
  if (typeof err === 'string') return err;
  if (typeof err?.message === 'string') return err.message;
  if (typeof err?.error === 'string') return err.error;
  return 'Request failed';
}

async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = await response.json();
      return safeJsonErrorMessage(json);
    } catch {
      return `Request failed (${response.status})`;
    }
  }
  try {
    const text = await response.text();
    return text ? `Request failed (${response.status}): ${text.substring(0, 200)}` : `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function getEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

class TrinityApiClient {
  private apiBase(): string {
    return getEnv('VITE_FENDER_API_URL').replace(/\/+$/, '');
  }

  private apiKey(): string {
    // ✅ support either var name (so you can migrate without breaking)
    return (import.meta.env.VITE_FENDER_API_KEY || import.meta.env.VITE_FENDER_AI_API_KEY) as string;
  }

  private requireApiKey(): string {
    const key = this.apiKey();
    if (!key) throw new Error('VITE_FENDER_API_KEY is not configured');
    return key;
  }

  private requestHeaders(): Record<string, string> {
    const apiKey = this.requireApiKey();

    // ✅ IMPORTANT:
    // Your Edge Functions are using "X-Fender-API-Key" (that’s what authenticateRequest expects).
    // Standardize everything to that header (inventory/vehicle were using X-API-Key before).
    return {
      'Content-Type': 'application/json',
      'X-Fender-API-Key': apiKey,
    };
  }

  async getDealer(): Promise<FenderDealer> {
    const { data, error } = await supabase.from('dealer_info').select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Dealer information not found');

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      city: data.city,
      state: data.state,
      address: data.address,
      zip_code: data.zip_code,
      email: data.email,
      website_url: data.website_url,
      logo_url: data.logo_url,
      primary_color: data.primary_color,
    };
  }

  async getInventory(params: InventoryParams = {}): Promise<InventoryResponse> {
    const base = this.apiBase();

    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.offset) queryParams.set('offset', String(params.offset));
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.q) queryParams.set('q', params.q);
    if (params.minPrice != null) queryParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice != null) queryParams.set('maxPrice', String(params.maxPrice));
    if (params.minYear != null) queryParams.set('minYear', String(params.minYear));
    if (params.maxYear != null) queryParams.set('maxYear', String(params.maxYear));

    const url = `${base}/functions/v1/public-inventory?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.requestHeaders(),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    return (await response.json()) as InventoryResponse;
  }

  async getVehicle(vehicleId: string): Promise<FenderVehicle> {
    const base = this.apiBase();
    const url = `${base}/functions/v1/public-vehicle/${vehicleId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.requestHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('Vehicle not found');
      throw new Error(await parseErrorResponse(response));
    }

    return (await response.json()) as FenderVehicle;
  }

  async submitForm(submission: FormSubmission): Promise<FormSubmissionResponse> {
    const base = this.apiBase();
    const url = `${base}/functions/v1/public-submit-form`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorMsg = await parseErrorResponse(response);
      console.error('[FenderAPI] Form submission failed:', response.status, errorMsg);
      throw new Error(errorMsg);
    }

    const result = (await response.json()) as FormSubmissionResponse;
    console.log('[FenderAPI] Form submission response:', result);
    return result;
  }
}

export const fenderApi = new TrinityApiClient();
export type {
  FenderDealer,
  FenderVehicle,
  InventoryParams,
  InventoryResponse,
  FormSubmission,
  FormSubmissionResponse,
  MediaItem,
  AIDetectedFeatures,
  PaginationInfo,
  ImageSize,
  VehicleInterestPayload,
};
