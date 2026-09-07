import Link from "next/link";

import { getProfile, getSession } from "../../../../features/account";
import { StatusPanel } from "../../../../features/platform";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) return <main className="account-page"><StatusPanel kind="forbidden" title="Sign in to see your profile." description="Your personal details are private to your account." action={<Link className="button button-dark" href="/login">Sign in</Link>} /></main>;
  try {
    const { item } = await getProfile();
    return <main className="account-page"><div className="account-heading"><p className="eyebrow">PROFILE</p><h1>{item.user.name}</h1><p>{item.user.email}</p></div><div className="detail-panel"><div><span>Email</span><strong>{item.user.email}</strong></div><div><span>Phone</span><strong>{item.user.phone ?? "Not added yet"}</strong></div><div><span>Locale</span><strong>{item.user.locale}</strong></div><div><span>Member since</span><strong>{new Date(item.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong></div></div></main>;
  } catch { return <main className="account-page"><StatusPanel kind="error" title="Profile unavailable." description="We could not load your profile right now." requestId={undefined} action={<Link className="button button-secondary" href="/account/profile">Try again</Link>} /></main>; }
}
