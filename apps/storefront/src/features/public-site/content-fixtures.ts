export const contentCategories = ["All stories", "Play ideas", "Product care", "Field notes"] as const;

export type ContentCategory = (typeof contentCategories)[number];

export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

export interface ContentArticle {
  slug: string;
  category: Exclude<ContentCategory, "All stories">;
  title: string;
  excerpt: string;
  readingTime: string;
  publishedLabel: string;
  tags: string[];
  accent: "coral" | "blue" | "lime";
  sections: ContentSection[];
}

export const contentArticles: ContentArticle[] = [
  {
    slug: "make-space-for-movement",
    category: "Play ideas",
    title: "Make space for movement.",
    excerpt: "A few thoughtful changes can turn the space you already have into a generous place to play.",
    readingTime: "4 min read",
    publishedLabel: "Preview story / 08 Sep 2026",
    tags: ["home play", "coordination", "family"],
    accent: "coral",
    sections: [
      { heading: "Start with an invitation", paragraphs: ["You do not need a dedicated playroom. Clear one small route, place one game within reach, and leave enough room for the rules to change.", "The best setup makes movement feel obvious without telling anyone exactly what to do."] },
      { heading: "Keep the rules light", paragraphs: ["Try a simple first round: roll, aim, balance, or carry. Then let the player add a challenge, change the distance, or make up a team name.", "A flexible game stays useful because it grows with the people in it."] },
      { heading: "Finish with a reset", paragraphs: ["Give every piece a home that is easy to reach. A two-minute reset keeps tomorrow's invitation ready and makes active play part of the rhythm of the day."] },
    ],
  },
  {
    slug: "care-for-your-wemove-set",
    category: "Product care",
    title: "Care for your set, keep the play going.",
    excerpt: "Simple storage and gentle cleaning help your favourite movement tools stay ready for the next round.",
    readingTime: "3 min read",
    publishedLabel: "Preview story / 05 Sep 2026",
    tags: ["care", "storage", "longevity"],
    accent: "blue",
    sections: [
      { heading: "Wipe, do not soak", paragraphs: ["Use a soft, lightly damp cloth for everyday marks. Mild soap is enough when a deeper clean is needed; allow every piece to dry fully before storing it."] },
      { heading: "Store by the next game", paragraphs: ["Keep sets together in a breathable basket or open shelf. Storing pieces by the way you play makes setup faster and makes missing pieces easy to spot."] },
      { heading: "Check before every round", paragraphs: ["A quick look for cracks, loose joins, or sharp edges is a good habit. Retire a damaged piece and contact the WEMOVE team if you need product guidance."] },
    ],
  },
  {
    slug: "the-quiet-power-of-a-shared-game",
    category: "Field notes",
    title: "The quiet power of a shared game.",
    excerpt: "The most memorable rounds are often the ones where nobody is keeping score for very long.",
    readingTime: "5 min read",
    publishedLabel: "Preview story / 01 Sep 2026",
    tags: ["together", "confidence", "play"],
    accent: "lime",
    sections: [
      { heading: "A common rhythm", paragraphs: ["Shared movement gives a group a rhythm to notice: whose turn is next, how far the target is, and when to cheer. Those small decisions create room for everyone to take part."] },
      { heading: "Make room for different speeds", paragraphs: ["One player may want a precise challenge while another wants to experiment. A good game can hold both without making either one feel behind."] },
      { heading: "The score is the memory", paragraphs: ["When the equipment is put away, what remains is the story of the round: a surprising bounce, a new idea, or the moment someone asked to play again."] },
    ],
  },
];

export function getContentArticle(slug: string) {
  return contentArticles.find((article) => article.slug === slug);
}

export function getRelatedContent(article: ContentArticle, limit = 2) {
  return contentArticles.filter((item) => item.slug !== article.slug && item.category === article.category).slice(0, limit).concat(
    contentArticles.filter((item) => item.slug !== article.slug && item.category !== article.category).slice(0, limit),
  ).slice(0, limit);
}
