import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const analysisNodeSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('text'),
    content: z.string(),
    anchorWordId: z.string(),
    position: z.object({ angle: z.number(), distance: z.number() }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('image'),
    src: z.string(),
    alt: z.string(),
    anchorWordId: z.string(),
    position: z.object({ angle: z.number(), distance: z.number() }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('link'),
    content: z.string(),
    url: z.string().url(),
    anchorWordId: z.string(),
    position: z.object({ angle: z.number(), distance: z.number() }),
  }),
  z.object({
    id: z.string(),
    type: z.literal('video'),
    content: z.string().url(),
    anchorWordId: z.string(),
    position: z.object({ angle: z.number(), distance: z.number() }),
  }),
]);

const verseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  year: z.number().optional(),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
  tags: z.array(z.string()).default([]),
  verseText: z.string().optional(),
  lines: z.array(
    z.object({
      lineIndex: z.number(),
      words: z.array(
        z.object({
          wordId: z.string(),
          text: z.string(),
        })
      ),
    })
  ),
  analysisGroups: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      triggerWordIds: z.array(z.string()),
      highlightWordIds: z.array(z.string()),
      highlightType: z.enum(['circle', 'underline', 'box', 'highlight']).default('circle'),
      connections: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
          label: z.string().optional(),
        })
      ).default([]),
      nodes: z.array(analysisNodeSchema).default([]),
    })
  ).default([]),
});

const verses = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/verses' }),
  schema: verseSchema,
});

export const collections = { verses };
