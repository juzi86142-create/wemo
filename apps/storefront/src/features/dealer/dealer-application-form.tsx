"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { DealerApplication, DealerApplicationCreateInput } from "@wemo/contracts";

import {
  clearDealerDraft,
  readDealerDraft,
  writeDealerDraft,
} from ".";
import { ApiError, analyticsEvents, trackEvent } from "../platform";
import { createDealerApplication } from "./dealer-adapter";
import { validateDealerApplication, type DealerApplicationFormValues } from "./dealer-validation";

const initialValues: DealerApplicationFormValues = {
  legalName: "",
  displayName: "",
  country: "GB",
  website: "",
  businessType: "",
  taxId: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  currency: "GBP",
};

const businessFields: Array<keyof DealerApplicationFormValues> = [
  "legalName",
  "displayName",
  "country",
  "businessType",
  "website",
  "taxId",
  "currency",
];

const contactFields: Array<keyof DealerApplicationFormValues> = [
  "contactName",
  "contactEmail",
  "contactPhone",
];

const apiFieldNames: Record<string, keyof DealerApplicationFormValues> = {
  legal_name: "legalName",
  display_name: "displayName",
  country: "country",
  website: "website",
  business_type: "businessType",
  tax_id: "taxId",
  contact_name: "contactName",
  contact_email: "contactEmail",
  contact_phone: "contactPhone",
  currency: "currency",
};

function toApplicationInput(values: DealerApplicationFormValues): DealerApplicationCreateInput {
  return {
    legal_name: values.legalName.trim(),
    display_name: values.displayName.trim(),
    country: values.country.trim(),
    website: values.website.trim() || null,
    business_type: values.businessType.trim(),
    tax_id: values.taxId.trim() || null,
    contact_name: values.contactName.trim(),
    contact_email: values.contactEmail.trim(),
    contact_phone: values.contactPhone.trim() || null,
    currency: values.currency.trim().toUpperCase(),
    payload: { source: "public_dealer_application" },
  };
}

function Field({
  name,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  required = false,
}: {
  name: keyof DealerApplicationFormValues;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  type?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean;
}) {
  const id = `dealer-${name}`;
  return (
    <div className="dealer-field">
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  children,
}: {
  name: keyof DealerApplicationFormValues;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
}) {
  const id = `dealer-${name}`;
  return (
    <div className="dealer-field">
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

export function DealerApplicationForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<DealerApplicationFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [application, setApplication] = useState<DealerApplication | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const draft = readDealerDraft();
    if (draft) setValues(draft);
    setHydrated(true);
    trackEvent(analyticsEvents.dealerApplyStart);
  }, []);

  useEffect(() => {
    if (hydrated && !application) writeDealerDraft(values);
  }, [application, hydrated, values]);

  function updateValue(field: keyof DealerApplicationFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitError(null);
  }

  function validateStep(fields: Array<keyof DealerApplicationFormValues>) {
    const nextErrors = validateDealerApplication(values);
    return fields.reduce<Record<string, string>>((result, field) => {
      const message = nextErrors[field];
      if (message) result[field] = message;
      return result;
    }, {});
  }

  function continueToContact() {
    const nextErrors = validateStep(businessFields);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDealerApplication(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      if (businessFields.some((field) => nextErrors[field])) setStep(1);
      return;
    }

    setPending(true);
    setSubmitError(null);
    try {
      const result = await createDealerApplication(toApplicationInput(values));
      clearDealerDraft();
      setApplication(result);
      trackEvent(analyticsEvents.dealerApplySubmit, { status: result.status, application_no: result.application_no });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError("We could not submit your application.", 0);
      const mappedErrors: Record<string, string> = {};
      for (const fieldError of apiError.fieldErrors) {
        const field = apiFieldNames[fieldError.field] ?? (fieldError.field as keyof DealerApplicationFormValues);
        if ([...businessFields, ...contactFields].includes(field)) mappedErrors[field] = fieldError.message;
      }
      setErrors(mappedErrors);
      setSubmitError(apiError);
      if (businessFields.some((field) => mappedErrors[field])) setStep(1);
    } finally {
      setPending(false);
    }
  }

  if (application) {
    return (
      <section className="dealer-success" aria-labelledby="dealer-success-title">
        <p className="eyebrow">APPLICATION RECEIVED</p>
        <h2 id="dealer-success-title">Thank you for moving with us.</h2>
        <p>Your application is now <strong>{application.status.replaceAll("_", " ")}</strong>. We will be in touch using the contact details you provided.</p>
        <dl className="dealer-success-details">
          <div><dt>Application number</dt><dd>{application.application_no}</dd></div>
          <div><dt>Business</dt><dd>{application.display_name}</dd></div>
        </dl>
        <div className="dealer-form-actions">
          <Link className="button button-dark" href="/dealers">Explore dealers</Link>
          <Link className="arrow-link" href="/">Back home <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    );
  }

  const errorMessage = submitError ? submitError.message : null;

  return (
    <form className="dealer-application-form" onSubmit={submit} noValidate>
      <div className="dealer-stepper" aria-label="Application progress">
        <span className={step === 1 ? "is-active" : "is-complete"}>01 <b>Business</b></span>
        <span className={step === 2 ? "is-active" : ""}>02 <b>Contact</b></span>
      </div>
      <p className="dealer-step-status" role="status" aria-live="polite">Step {step} of 2: {step === 1 ? "business details" : "contact details"}</p>
      {errorMessage ? <div className="form-error" role="alert"><strong>We could not submit your application.</strong><span>{errorMessage}</span>{submitError?.requestId ? <span>Request ID: {submitError.requestId}</span> : null}</div> : null}
      {step === 1 ? (
        <fieldset className="dealer-form-section">
          <legend>Tell us about the business</legend>
          <p className="dealer-section-note">These details help us understand how WEMOVE could fit your customers.</p>
          <div className="dealer-form-grid">
            <Field name="legalName" label="Legal business name" value={values.legalName} onChange={(value) => updateValue("legalName", value)} error={errors.legalName} required />
            <Field name="displayName" label="Public display name" value={values.displayName} onChange={(value) => updateValue("displayName", value)} error={errors.displayName} required />
            <SelectField name="country" label="Country or region" value={values.country} onChange={(value) => updateValue("country", value)} error={errors.country} required>
              <option value="">Choose a country</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </SelectField>
            <Field name="businessType" label="Business type" value={values.businessType} onChange={(value) => updateValue("businessType", value)} error={errors.businessType} placeholder="Retail, school supplier..." required />
            <Field name="website" label="Website" value={values.website} onChange={(value) => updateValue("website", value)} error={errors.website} type="url" placeholder="https://" />
            <Field name="taxId" label="Tax ID" value={values.taxId} onChange={(value) => updateValue("taxId", value)} error={errors.taxId} />
            <Field name="currency" label="Trading currency" value={values.currency} onChange={(value) => updateValue("currency", value)} error={errors.currency} placeholder="GBP" required />
          </div>
          <div className="dealer-form-actions">
            <button className="button button-dark" type="button" onClick={continueToContact}>Continue to contact <span aria-hidden="true">↗</span></button>
          </div>
        </fieldset>
      ) : (
        <fieldset className="dealer-form-section">
          <legend>Who should we speak with?</legend>
          <p className="dealer-section-note">We will use these details only to follow up on your dealer application.</p>
          <div className="dealer-form-grid">
            <Field name="contactName" label="Contact name" value={values.contactName} onChange={(value) => updateValue("contactName", value)} error={errors.contactName} required />
            <Field name="contactEmail" label="Email address" value={values.contactEmail} onChange={(value) => updateValue("contactEmail", value)} error={errors.contactEmail} type="email" required />
            <Field name="contactPhone" label="Phone number" value={values.contactPhone} onChange={(value) => updateValue("contactPhone", value)} error={errors.contactPhone} type="tel" />
          </div>
          <p className="dealer-draft-note">Your progress is saved on this device until you submit or clear this application.</p>
          <div className="dealer-form-actions">
            <button className="button button-secondary" type="button" onClick={() => setStep(1)} disabled={pending}>Back</button>
            <button className="button button-dark" type="submit" disabled={pending}>{pending ? "Sending application..." : "Send application"} {!pending ? <span aria-hidden="true">↗</span> : null}</button>
          </div>
        </fieldset>
      )}
      <p className="dealer-privacy-note">By sending an application, you agree that WEMOVE may contact you about becoming an authorised dealer. This form does not collect children's data.</p>
    </form>
  );
}
