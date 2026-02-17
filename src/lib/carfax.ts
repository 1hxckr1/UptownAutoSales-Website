interface VehicleWithVin {
  vin?: string | null;
  VIN?: string | null;
  vin_number?: string | null;
  vinNumber?: string | null;
}

export function normalizeVin(vehicle: VehicleWithVin | string | null | undefined): string | null {
  if (!vehicle) {
    console.debug('[CARFAX] normalizeVin: vehicle is null/undefined');
    return null;
  }

  let rawVin: string | null | undefined;

  if (typeof vehicle === 'string') {
    rawVin = vehicle;
  } else {
    rawVin = vehicle.vin || vehicle.VIN || vehicle.vin_number || vehicle.vinNumber;
  }

  if (!rawVin) {
    console.debug('[CARFAX] normalizeVin: no VIN field found in vehicle');
    return null;
  }

  const cleaned = rawVin
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (cleaned.length !== 17) {
    console.debug(`[CARFAX] normalizeVin: invalid VIN length (${cleaned.length}): "${cleaned}"`);
    return null;
  }

  console.debug(`[CARFAX] normalizeVin: valid VIN extracted: ${cleaned}`);
  return cleaned;
}

export function buildCarfaxUrl(vin: string): string {
  const encodedVin = encodeURIComponent(vin);
  const url = `http://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${encodedVin}`;
  console.debug(`[CARFAX] buildCarfaxUrl: generated URL for VIN ${vin}`);
  return url;
}

export function getCarfaxUrl(vehicle: VehicleWithVin | string | null | undefined): string | null {
  const vin = normalizeVin(vehicle);
  if (!vin) return null;
  return buildCarfaxUrl(vin);
}

export function isValidVin(vehicle: VehicleWithVin | string | null | undefined): boolean {
  return normalizeVin(vehicle) !== null;
}

export function auditInventoryVins(vehicles: VehicleWithVin[]): {
  total: number;
  valid: number;
  invalid: number;
  missing: number;
  validVehicles: Array<{ id: any; vin: string; valid: boolean }>;
  invalidVehicles: Array<{ id: any; vin: string | null; reason: string }>;
} {
  const validVehicles: Array<{ id: any; vin: string; valid: boolean }> = [];
  const invalidVehicles: Array<{ id: any; vin: string | null; reason: string }> = [];
  let missing = 0;
  let invalid = 0;
  let valid = 0;

  vehicles.forEach((vehicle: any) => {
    const rawVin = vehicle.vin || vehicle.VIN || vehicle.vin_number || vehicle.vinNumber;
    const normalizedVin = normalizeVin(vehicle);

    if (!rawVin) {
      missing++;
      invalidVehicles.push({
        id: vehicle.id,
        vin: null,
        reason: 'Missing VIN field',
      });
    } else if (!normalizedVin) {
      invalid++;
      invalidVehicles.push({
        id: vehicle.id,
        vin: rawVin,
        reason: `Invalid VIN length or format (length: ${rawVin.trim().length})`,
      });
    } else {
      valid++;
      validVehicles.push({
        id: vehicle.id,
        vin: normalizedVin,
        valid: true,
      });
    }
  });

  return {
    total: vehicles.length,
    valid,
    invalid,
    missing,
    validVehicles,
    invalidVehicles,
  };
}
