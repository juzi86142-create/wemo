const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewsletterEmail(email: string) {
  return emailPattern.test(email.trim()) ? undefined : "Enter a valid email address.";
}
