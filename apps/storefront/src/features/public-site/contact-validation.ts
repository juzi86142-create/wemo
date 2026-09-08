export interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!emailPattern.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!values.message.trim()) errors.message = "Tell us how we can help.";
  return errors;
}
