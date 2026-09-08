export interface DealerApplicationFormValues {
  legalName: string;
  displayName: string;
  country: string;
  website: string;
  businessType: string;
  taxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
}

export function validateDealerApplication(values: DealerApplicationFormValues) {
  const errors: Record<string, string> = {};
  if (!values.legalName.trim()) errors.legalName = "Enter the legal business name.";
  if (!values.displayName.trim()) errors.displayName = "Enter the name customers should see.";
  if (!values.country.trim()) errors.country = "Enter the business country.";
  if (!values.businessType.trim()) errors.businessType = "Enter the business type.";
  if (!values.contactName.trim()) errors.contactName = "Enter a contact name.";
  if (!values.contactEmail.trim() || !values.contactEmail.includes("@")) {
    errors.contactEmail = "Enter a valid contact email address.";
  }
  if (values.website.trim()) {
    try {
      const url = new URL(values.website.trim());
      if (!/^https?:$/.test(url.protocol)) errors.website = "Use an http or https website URL.";
    } catch {
      errors.website = "Enter a valid website URL.";
    }
  }
  if (values.currency.trim().length !== 3) errors.currency = "Use a three-letter currency code.";
  return errors;
}
