import Link from "next/link";

import { getProfile, getSession, ProfileEditor } from "../../../../features/account";
import { StatusPanel } from "../../../../features/platform";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return <main className="account-page"><StatusPanel kind="forbidden" title="Sign in to see your profile." description="Your personal details are private to your account." action={<Link className="button button-dark" href="/login">Sign in</Link>} /></main>;
  try {
    const { item } = await getProfile();
    return <main className="account-page"><div className="account-heading"><p className="eyebrow">PROFILE</p><h1>Your details.</h1><p>Review your contact details and update the local browser demo while account editing is connected.</p></div><ProfileEditor profile={item} /></main>;
  } catch { return <main className="account-page"><StatusPanel kind="error" title="Profile unavailable." description="We could not load your profile right now." requestId={undefined} action={<Link className="button button-secondary" href="/account/profile">Try again</Link>} /></main>; }
}
