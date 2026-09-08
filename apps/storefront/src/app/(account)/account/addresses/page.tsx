import Link from "next/link";

import { AddressBook, getAddresses, getSession } from "../../../../features/account";
import { StatusPanel } from "../../../../features/platform";

export default async function AddressesPage() {
  const session = await getSession();
  if (!session) return <main className="account-page"><StatusPanel kind="forbidden" title="Sign in to see your addresses." description="Saved delivery details are private to your account." action={<Link className="button button-dark" href="/login">Sign in</Link>} /></main>;
  try {
    const response = await getAddresses();
    return <main className="account-page"><div className="account-heading"><p className="eyebrow">ADDRESS BOOK</p><h1>Places to play.</h1><p>Your saved delivery details.</p></div><AddressBook addresses={response.items} userId={session.user_id} /></main>;
  } catch { return <main className="account-page"><StatusPanel kind="error" title="Addresses unavailable." description="We could not load your address book right now." action={<Link className="button button-secondary" href="/account/addresses">Try again</Link>} /></main>; }
}
