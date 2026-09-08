import Link from "next/link";

import type { ContentArticle } from "./content-fixtures";

export function ContentCard({ article }: { article: ContentArticle }) {
  return <article className={`content-card content-card-${article.accent}`}><div className="content-card-art" aria-hidden="true"><span>{article.category}</span><strong>0{article.slug.length % 10}</strong></div><div className="content-card-body"><div className="content-card-meta"><span>{article.category}</span><span>{article.readingTime}</span></div><h2><Link href={`/content/${article.slug}`}>{article.title}</Link></h2><p>{article.excerpt}</p><Link className="arrow-link" href={`/content/${article.slug}`}>Read story <span aria-hidden="true">↗</span></Link></div></article>;
}
