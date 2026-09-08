import Link from "next/link";

import { DealerApplicationForm } from "../../../../features/dealer";

export default function DealerApplicationPage() {
  return (
    <main className="dealer-page dealer-application-page">
      <section className="page-hero page-hero-dealers">
        <p className="eyebrow">HOME / DEALERS / APPLY</p>
        <h1>Bring better play closer.</h1>
        <p>Tell us a little about your business and the people you serve. We will review your application and be in touch.</p>
        <Link className="arrow-link" href="/dealers">Back to dealer network <span aria-hidden="true">↗</span></Link>
      </section>
      <section className="dealer-application" aria-labelledby="dealer-application-title">
        <div className="dealer-application-intro">
          <p className="eyebrow">BECOME A PARTNER</p>
          <h2 id="dealer-application-title">A good place to start.</h2>
          <p>We work with thoughtful retailers, school suppliers, and play spaces that want to make movement part of everyday life.</p>
          <div className="dealer-application-mark" aria-hidden="true">W</div>
        </div>
        <DealerApplicationForm />
      </section>
    </main>
  );
}
