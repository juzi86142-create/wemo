export interface PublicAddressDisplay {
  line1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export function readPublicAddress(payload: unknown): PublicAddressDisplay {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const source = payload as Record<string, unknown>;
  const text = (...keys: string[]) => {
    for (const key of keys) {
      if (typeof source[key] === "string" && source[key]) return source[key] as string;
    }
    return undefined;
  };

  const result: PublicAddressDisplay = {};
  const line1 = text("line1", "address_line1", "street");
  const city = text("city", "town");
  const region = text("region", "state", "province");
  const postalCode = text("postal_code", "postalCode", "zip");
  const country = text("country", "country_code", "countryCode");
  const phone = text("phone", "telephone");
  if (line1) result.line1 = line1;
  if (city) result.city = city;
  if (region) result.region = region;
  if (postalCode) result.postalCode = postalCode;
  if (country) result.country = country;
  if (phone) result.phone = phone;
  return result;
}
