import { ContentCard, contentArticles, contentCategories, type ContentCategory } from "../../../features/public-site";
import { StatusPanel } from "../../../features/platform";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = valueOf(params.category);
  const selectedCategory = contentCategories.includes(category as ContentCategory) ? category as ContentCategory : "All stories";
  const articles = selectedCategory === "All stories" ? contentArticles : contentArticles.filter((article) => article.category === selectedCategory);

  return <main className="page-main"><section className="page-hero page-hero-content"><p className="eyebrow">WEMOVE / STORIES</p><h1>Small notes for bigger movement.</h1><p>Play ideas, product care, and field notes for making room to move together.</p><div className="catalog-metrics"><div><strong>{contentArticles.length}</strong><span>preview stories</span></div><div><strong>LOCAL</strong><span>demo content</span></div></div></section><section className="content-section" aria-labelledby="content-title"><div className="content-header"><div><p className="eyebrow">THE JOURNAL</p><h2 id="content-title">Choose a place to begin.</h2></div><p>These editorial previews are stored in the frontend until a CMS is connected.</p></div><nav className="content-filters" aria-label="Story categories">{contentCategories.map((item) => <a className={item === selectedCategory ? "is-active" : undefined} href={item === "All stories" ? "/content" : `/content?category=${encodeURIComponent(item)}`} key={item}>{item}</a>)}</nav>{articles.length === 0 ? <StatusPanel kind="empty" title="No stories in this corner yet." description="Choose another category to see the local preview stories." action={<a className="button button-secondary" href="/content">View all stories</a>} /> : <div className="content-grid">{articles.map((article) => <ContentCard article={article} key={article.slug} />)}</div>}</section></main>;
}
