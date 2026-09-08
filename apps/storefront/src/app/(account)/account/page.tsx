import Link from "next/link";

export default function AccountPage() {
  return <main className="account-page"><div className="account-heading"><p className="eyebrow">OVERVIEW</p><h1>Welcome back.</h1><p>Keep your details together and get back to the good stuff.</p></div><div className="account-card-grid"><Link className="account-card account-card-signal" href="/account/profile"><span>01</span><h2>Profile</h2><p>Update your personal details.</p><strong aria-hidden="true">↗</strong></Link><Link className="account-card account-card-blue" href="/account/addresses"><span>02</span><h2>Addresses</h2><p>Keep delivery details ready.</p><strong aria-hidden="true">↗</strong></Link><Link className="account-card account-card-lime" href="/account/orders"><span>03</span><h2>Orders</h2><p>See your movement history.</p><strong aria-hidden="true">↗</strong></Link></div></main>;
}
