import Link from "next/link";

const supportCards = [
  { number: "01", title: "Choose a game", copy: "Find a starting point for your space, group, and energy level.", tone: "support-card-signal" },
  { number: "02", title: "Product questions", copy: "Care, setup, and what to expect from your WEMOVE set.", tone: "support-card-blue" },
  { number: "03", title: "Talk to us", copy: "Our team can help with product, order, and dealer questions.", tone: "support-card-lime" },
];

export default function SupportPage() {
  return (
    <main className="page-main">
      <section className="page-hero page-hero-support"><p className="eyebrow">SUPPORT HUB</p><h1>Keep the good kind of busy going.</h1><p>Answers, ideas, and a direct line to the people behind WEMOVE.</p></section>
      <section className="support-grid-section" aria-labelledby="support-options-title">
        <div className="section-heading"><p className="eyebrow">START HERE</p><h2 id="support-options-title">A little help goes a long way.</h2></div>
        <div className="support-card-grid">{supportCards.map((card) => <Link className={"support-card " + card.tone} href={card.number === "03" ? "#contact" : "#faq"} key={card.number}><span>{card.number}</span><h3>{card.title}</h3><p>{card.copy}</p><strong aria-hidden="true">↗</strong></Link>)}</div>
      </section>
      <section className="faq-section" id="faq" aria-labelledby="faq-title">
        <div><p className="eyebrow">QUICK ANSWERS</p><h2 id="faq-title">Good to know.</h2></div>
        <div className="faq-list"><details open><summary>Where can we play?</summary><p>WEMOVE games are made to move between the living room, the garden, and the park. Check each product for its recommended space.</p></details><details><summary>What age are the products for?</summary><p>Each product has an age range to help you choose. The best guide is always the child, the space, and the way you play together.</p></details><details><summary>Can I become a dealer?</summary><p>Yes. Reach out through the contact form and our team will help with the next step.</p></details></div>
      </section>
      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div><p className="eyebrow">SAY HELLO</p><h2 id="contact-title">Have a question? Let&apos;s move it forward.</h2></div><a className="button button-dark" href="mailto:hello@wemovetoy.com">Email the team <span aria-hidden="true">↗</span></a></section>
    </main>
  );
}
