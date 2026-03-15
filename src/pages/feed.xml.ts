import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const verses = await getCollection('verses');
  return rss({
    title: 'RHYMOTEK',
    description: 'Explore rap lyrics verse by verse with interactive visual analysis.',
    site: context.site!,
    items: verses.map((verse) => ({
      title: `${verse.data.title} — ${verse.data.artist}`,
      link: `/verse/${verse.data.slug}/`,
      description: `${verse.data.title} by ${verse.data.artist}${verse.data.album ? ` from ${verse.data.album}` : ''}. Explore the verse with interactive analysis.`,
    })),
  });
}
