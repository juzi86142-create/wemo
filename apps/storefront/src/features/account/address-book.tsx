"use client";

import type { IdentityAddress } from "@wemo/contracts";
import { useEffect, useState } from "react";

import { ActionFeedback, readDemoValue, writeDemoValue } from "../platform";
import {
  createAccountDemoState,
  createDemoAddressId,
  removeDemoAddress,
  setDemoDefaultAddress,
  upsertDemoAddress,
  validateAccountDemoState,
  type AccountDemoAddress,
  type AccountDemoState,
} from "./account-demo-state";

type Feedback = "idle" | "pending" | "success" | "error";
type AddressDraft = Omit<AccountDemoAddress, "id" | "isDefault">;

const emptyDraft: AddressDraft = {
  kind: "Home",
  recipient: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

function stringValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function toDemoAddress(address: IdentityAddress, index: number): AccountDemoAddress {
  const payload = address.payload && typeof address.payload === "object" && !Array.isArray(address.payload)
    ? address.payload as Record<string, unknown>
    : {};
  return {
    id: address.id,
    kind: address.kind,
    recipient: stringValue(payload, "recipient", "name"),
    line1: stringValue(payload, "line1", "address_line1", "street"),
    line2: stringValue(payload, "line2", "address_line2"),
    city: stringValue(payload, "city"),
    region: stringValue(payload, "region", "state"),
    postalCode: stringValue(payload, "postalCode", "postal_code", "zip"),
    country: stringValue(payload, "country"),
    isDefault: index === 0,
  };
}

function addressState(addresses: IdentityAddress[]): AccountDemoState {
  return createAccountDemoState({ addresses: addresses.map(toDemoAddress) });
}

function asDraft(address: AccountDemoAddress): AddressDraft {
  const { id: _id, isDefault: _isDefault, ...draft } = address;
  return draft;
}

export function AddressBook({ addresses, userId }: { addresses: IdentityAddress[]; userId: string | number }) {
  const storageKey = `addresses:${userId}`;
  const [state, setState] = useState(() => addressState(addresses));
  const [editingId, setEditingId] = useState<AccountDemoAddress["id"] | "new" | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft);
  const [confirmingId, setConfirmingId] = useState<AccountDemoAddress["id"] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>("idle");

  useEffect(() => {
    const fallback = addressState(addresses);
    const saved = validateAccountDemoState(readDemoValue<unknown>("account", storageKey, fallback), fallback);
    setState(saved);
  }, [addresses, storageKey]);

  function persist(next: AccountDemoState, onSuccess?: () => void) {
    setFeedback("pending");
    window.setTimeout(() => {
      if (writeDemoValue("account", storageKey, next)) {
        setState(next);
        setFeedback("success");
        onSuccess?.();
      } else {
        setFeedback("error");
      }
    }, 180);
  }

  function edit(address: AccountDemoAddress) {
    setEditingId(address.id);
    setDraft(asDraft(address));
    setFeedback("idle");
  }

  function update(field: keyof AddressDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (feedback !== "idle") setFeedback("idle");
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.recipient.trim() || !draft.line1.trim() || !draft.city.trim() || !draft.country.trim()) {
      setFeedback("error");
      return;
    }
    const id = editingId === "new" ? createDemoAddressId(state) : editingId;
    if (id === null) return;
    const current = state.addresses.find((item) => item.id === id);
    persist(
      upsertDemoAddress(state, { ...draft, id, isDefault: current?.isDefault ?? state.addresses.length === 0 }),
      () => {
        setEditingId(null);
        setDraft(emptyDraft);
      },
    );
  }

  function remove(addressId: AccountDemoAddress["id"]) {
    persist(removeDemoAddress(state, addressId), () => setConfirmingId(null));
  }

  return (
    <section className="address-book" aria-labelledby="address-book-heading">
      <div className="account-editor-heading">
        <div>
          <p className="eyebrow">SAVED DELIVERY DETAILS</p>
          <h2 id="address-book-heading">Addresses for the next move.</h2>
        </div>
        <button className="button button-dark" type="button" disabled={feedback === "pending"} onClick={() => { setEditingId("new"); setDraft(emptyDraft); setFeedback("idle"); }}>Add address</button>
      </div>
      <p className="account-demo-copy">Address changes are saved only in this browser until the address API supports updates.</p>
      {editingId ? (
        <form className="account-editor-form address-editor" onSubmit={save}>
          <div className="field"><label htmlFor="address-kind">Label</label><input id="address-kind" value={draft.kind} onChange={(event) => update("kind", event.target.value)} /></div>
          <div className="field"><label htmlFor="address-recipient">Recipient</label><input id="address-recipient" value={draft.recipient} onChange={(event) => update("recipient", event.target.value)} aria-invalid={feedback === "error" && !draft.recipient.trim()} /></div>
          <div className="field address-field-wide"><label htmlFor="address-line1">Address line 1</label><input id="address-line1" value={draft.line1} onChange={(event) => update("line1", event.target.value)} aria-invalid={feedback === "error" && !draft.line1.trim()} /></div>
          <div className="field address-field-wide"><label htmlFor="address-line2">Address line 2</label><input id="address-line2" value={draft.line2} onChange={(event) => update("line2", event.target.value)} /></div>
          <div className="field"><label htmlFor="address-city">City</label><input id="address-city" value={draft.city} onChange={(event) => update("city", event.target.value)} aria-invalid={feedback === "error" && !draft.city.trim()} /></div>
          <div className="field"><label htmlFor="address-region">State / region</label><input id="address-region" value={draft.region} onChange={(event) => update("region", event.target.value)} /></div>
          <div className="field"><label htmlFor="address-postal">Postal code</label><input id="address-postal" value={draft.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></div>
          <div className="field"><label htmlFor="address-country">Country</label><input id="address-country" value={draft.country} onChange={(event) => update("country", event.target.value)} aria-invalid={feedback === "error" && !draft.country.trim()} /></div>
          <div className="account-editor-actions address-editor-actions"><button className="button button-dark" type="submit" disabled={feedback === "pending"}>{editingId === "new" ? "Save local address" : "Update local address"}</button><button className="button button-secondary" type="button" disabled={feedback === "pending"} onClick={() => { setEditingId(null); setFeedback("idle"); }}>Cancel</button><ActionFeedback status={feedback} idleMessage="Required fields are marked when you save." pendingMessage="Saving local address..." successMessage="Local address updated. It was not sent to the delivery service." errorMessage={feedback === "error" && !draft.recipient.trim() ? "Add recipient, address line, city, and country. Your input is still here." : "The local address could not be updated. Your input is still here."} /></div>
        </form>
      ) : null}
      {state.addresses.length === 0 ? <div className="account-address-empty"><h3>No saved addresses yet.</h3><p>Add a delivery address when you are ready. It will remain a local browser demo until live address updates are connected.</p></div> : <div className="address-list">{state.addresses.map((address) => <article className="address-card" key={address.id}><div className="address-card-heading"><span>{address.kind}</span>{address.isDefault ? <b>Default</b> : null}</div><p><strong>{address.recipient || "Recipient not set"}</strong><br />{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />{[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}<br />{address.country}</p><div className="address-card-actions"><button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => edit(address)}>Edit</button>{!address.isDefault ? <button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => persist(setDemoDefaultAddress(state, address.id))}>Make default</button> : null}{confirmingId === address.id ? <><button className="text-button address-delete-confirm" type="button" disabled={feedback === "pending"} onClick={() => remove(address.id)}>Confirm remove</button><button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => setConfirmingId(null)}>Cancel</button></> : <button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => setConfirmingId(address.id)}>Remove</button>}</div></article>)}</div>}
      <ActionFeedback status={feedback} idleMessage={null} pendingMessage="Updating local browser addresses..." successMessage="Local address book updated. No live address change was submitted." errorMessage="The local address could not be updated. Your input is still here." />
    </section>
  );
}
