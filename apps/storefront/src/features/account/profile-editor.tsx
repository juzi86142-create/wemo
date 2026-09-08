"use client";

import type { Order } from "@wemo/contracts";
import { useEffect, useState } from "react";

import { ActionFeedback, readDemoValue, writeDemoValue } from "../platform";
import {
  createAccountDemoState,
  validateAccountDemoState,
  updateDemoProfile,
  type AccountDemoProfile,
  type AccountDemoState,
} from "./account-demo-state";
import type { AccountProfile } from "./account-adapter";

type Feedback = "idle" | "pending" | "success" | "error";

function profileState(profile: AccountProfile): AccountDemoState {
  return createAccountDemoState({
    profile: {
      name: profile.user.name,
      phone: profile.user.phone ?? "",
      locale: profile.user.locale,
    },
    addresses: [],
  });
}

export function ProfileEditor({ profile }: { profile: AccountProfile }) {
  const storageKey = `profile:${profile.user.id}`;
  const [state, setState] = useState(() => profileState(profile));
  const [draft, setDraft] = useState<AccountDemoProfile>(() => profileState(profile).profile);
  const [feedback, setFeedback] = useState<Feedback>("idle");

  useEffect(() => {
    const fallback = profileState(profile);
    const saved = validateAccountDemoState(readDemoValue<unknown>("account", storageKey, fallback), fallback);
    setState(saved);
    setDraft(saved.profile);
  }, [profile, storageKey]);

  function update(field: keyof AccountDemoProfile, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (feedback !== "idle") setFeedback("idle");
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setFeedback("error");
      return;
    }

    setFeedback("pending");
    window.setTimeout(() => {
      const next = updateDemoProfile(state, {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        locale: draft.locale,
      });
      if (writeDemoValue("account", storageKey, next)) {
        setState(next);
        setFeedback("success");
      } else {
        setFeedback("error");
      }
    }, 250);
  }

  return (
    <section className="account-editor" aria-labelledby="profile-editor-heading">
      <div className="account-editor-heading">
        <div>
          <p className="eyebrow">PERSONAL DETAILS</p>
          <h2 id="profile-editor-heading">Keep your profile current.</h2>
        </div>
        <span className="account-demo-label">Browser demo</span>
      </div>
      <form className="account-editor-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="profile-name">Name</label>
          <input id="profile-name" value={draft.name} onChange={(event) => update("name", event.target.value)} aria-invalid={feedback === "error" && !draft.name.trim()} />
        </div>
        <div className="field">
          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" value={profile.user.email} readOnly aria-readonly="true" />
        </div>
        <div className="field">
          <label htmlFor="profile-phone">Phone</label>
          <input id="profile-phone" type="tel" value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Add a phone number" />
        </div>
        <div className="field">
          <label htmlFor="profile-locale">Locale</label>
          <select id="profile-locale" value={draft.locale} onChange={(event) => update("locale", event.target.value)}>
            <option value="en-US">English (United States)</option>
            <option value="en-GB">English (United Kingdom)</option>
            <option value="fr-FR">Francais (France)</option>
            <option value="de-DE">Deutsch (Deutschland)</option>
          </select>
        </div>
        <div className="account-editor-actions">
          <button className="button button-dark" type="submit" disabled={feedback === "pending"}>{feedback === "pending" ? "Saving..." : "Save local changes"}</button>
          <ActionFeedback
            status={feedback}
            idleMessage="Profile changes stay in this browser until the account update API is available."
            pendingMessage="Saving a local browser demo..."
            successMessage="Local profile updated. It was not sent to the account service."
            errorMessage={!draft.name.trim() ? "Enter your name before saving. Your input is still here." : "The local profile could not be updated. Your input is still here."}
          />
        </div>
      </form>
      <p className="account-editor-meta">Member since {new Date(profile.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
    </section>
  );
}

export function AccountOrderActions({ order }: { order: Order }) {
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [action, setAction] = useState("reorder");

  function run(nextAction: string) {
    setAction(nextAction);
    setFeedback("pending");
    window.setTimeout(() => setFeedback("success"), 250);
  }

  return (
    <section className="account-order-actions" aria-label={`Actions for order ${order.order_no}`}>
      <div>
        <button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => run("reorder")}>Reorder</button>
        <button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => run("return")}>Request return</button>
        <button className="text-button" type="button" disabled={feedback === "pending"} onClick={() => run("support")}>Order support</button>
      </div>
      <ActionFeedback
        status={feedback}
        idleMessage="Order actions are available as local demo controls."
        pendingMessage={`Preparing a local ${action} request...`}
        successMessage={`Local ${action} request recorded. No live order action was submitted.`}
        errorMessage="This local order action is unavailable."
      />
    </section>
  );
}
