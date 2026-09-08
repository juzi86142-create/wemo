import Link from "next/link";
import type { DealerPublicListing } from "@wemo/contracts";

import { readPublicAddress } from "./dealer-display";

export function DealerListingCard({ listing }: { listing: DealerPublicListing }) {
  const address = listing.addresses[0];
  const displayAddress = readPublicAddress(address?.public_listing ?? address?.payload);
  const addressLine = [displayAddress.line1, displayAddress.city, displayAddress.region, displayAddress.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="dealer-listing-card">
      <div className="dealer-listing-card-top">
        <p className="eyebrow">{listing.company.business_type}</p>
        <span className="dealer-country">{listing.company.country}</span>
      </div>
      <h2>{listing.company.display_name}</h2>
      {addressLine ? <p className="dealer-address">{addressLine}</p> : <p className="dealer-address dealer-address-muted">Public address not published.</p>}
      {displayAddress.phone ? <a className="dealer-contact-link" href={`tel:${displayAddress.phone}`}>{displayAddress.phone}</a> : null}
      {listing.company.website ? <a className="dealer-contact-link" href={listing.company.website} rel="noreferrer" target="_blank">Visit website <span aria-hidden="true">↗</span></a> : null}
      <Link className="arrow-link" href="/dealers/apply">Become a dealer <span aria-hidden="true">↗</span></Link>
    </article>
  );
}
