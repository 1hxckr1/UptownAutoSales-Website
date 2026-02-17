export function isValidVin(vin: string | undefined | null): boolean {
  if (!vin) return false;
  const trimmedVin = vin.trim();
  return trimmedVin.length === 17;
}

export function getCarfaxUrl(vin: string): string {
  const cleanVin = vin.trim().toUpperCase();
  return `http://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${cleanVin}`;
}
