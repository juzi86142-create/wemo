import Link from "next/link";

import { getSession } from "../../../features/account";
import { StatusPanel } from "../../../features/platform";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) return <main className="account-page"><StatusPanel kind="forbidden" title="Your space is waiting." description="Sign in to view your profile, addresses, and orders." action={<Link className="button button-dark" href="/login">Sign in</Link>} /></main>;

  return <main className="account-page"><div className="account-heading"><p className="eyebrow">OVERVIEW</p><h1>Welcome back.</h1><p>Keep your details together and get back to the good stuff.</p></div><div className="account-card-grid"><Link className="account-card account-card-signal" href="/account/profile"><span>01</span><h2>Profile</h2><p>Update your personal details.</p><strong aria-hidden="true">↗</strong></Link><Link className="account-card account-card-blue" href="/account/addresses"><span>02</span><h2>Addresses</h2><p>Keep delivery details ready.</p><strong aria-hidden="true">↗</strong></Link><Link className="account-card account-card-lime" href="/account/orders"><span>03</span><h2>Orders</h2><p>See your movement history.</p><strong aria-hidden="true">↗</strong></Link></div></main>;
}
