export interface CheckoutFormValues {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  couponCode: string;
  note: string;
}

export function validateCheckoutFields(values: CheckoutFormValues) {
  const errors: Record<string, string> = {};
  const email = values.email.trim();

  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!email || !email.includes("@")) errors.email = "Enter a valid email address.";
  if (!values.addressLine1.trim()) errors.addressLine1 = "Enter your address.";
  if (!values.city.trim()) errors.city = "Enter your city.";
  if (!values.postalCode.trim()) errors.postalCode = "Enter your postal code.";
  if (!values.country.trim()) errors.country = "Enter your country.";

  return errors;
}
