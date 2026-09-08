import Link from "next/link";

import { StatusPanel } from "../../../../features/platform";

export default function ContentNotFound() {
  return <main className="page-main"><section className="content-not-found"><StatusPanel kind="empty" title="That story has moved." description="Try another preview story from the WEMOVE journal." action={<Link className="button button-dark" href="/content">View stories</Link>} /></section></main>;
}
