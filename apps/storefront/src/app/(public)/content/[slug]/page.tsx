import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentCard, getContentArticle, getRelatedContent } from "../../../../features/public-site";

export default async function ContentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getContentArticle(slug);
  if (!article) notFound();
  const related = getRelatedContent(article);

  return <main className="page-main"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/content">Stories</Link><span aria-hidden="true">/</span><span>{article.title}</span></nav><section className={`content-detail-hero content-detail-hero-${article.accent}`}><div><p className="eyebrow">{article.category} / PREVIEW STORY</p><h1>{article.title}</h1><p>{article.excerpt}</p><div className="content-detail-meta"><span>{article.publishedLabel}</span><span>{article.readingTime}</span></div></div><div className="content-detail-mark" aria-hidden="true"><span>W</span><strong>PREVIEW</strong></div></section><article className="content-article"><div className="content-article-tags">{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<p className="content-article-note">This is a local preview story. Editorial publishing and CMS persistence will be connected separately.</p></article><section className="related-section content-related" aria-labelledby="related-content-title"><div className="section-heading"><div><p className="eyebrow">KEEP MOVING</p><h2 id="related-content-title">More from the journal.</h2></div><Link className="arrow-link" href="/content">View all stories <span aria-hidden="true">↗</span></Link></div><div className="content-grid">{related.map((item) => <ContentCard article={item} key={item.slug} />)}</div></section></main>;
}
