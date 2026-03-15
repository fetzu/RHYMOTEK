import { defineConfig, type TinaField } from 'tinacms';
import AnnotationEditor from './fields/AnnotationEditor';

const positionFields: TinaField[] = [
  {
    type: 'number',
    name: 'angle',
    label: 'Angle (degrees)',
    description: '0=right, 90=below, 180=left, 270=above',
    required: true,
  },
  {
    type: 'number',
    name: 'distance',
    label: 'Distance (px)',
    required: true,
  },
];

const analysisNodeFields: TinaField[] = [
  { type: 'string', name: 'id', label: 'Node ID', required: true },
  {
    type: 'string',
    name: 'type',
    label: 'Type',
    required: true,
    options: ['text', 'image', 'link', 'video'],
  },
  {
    type: 'string',
    name: 'content',
    label: 'Content (text content, video embed URL)',
    ui: { component: 'textarea' },
  },
  { type: 'string', name: 'src', label: 'Image Source (for image type)' },
  { type: 'string', name: 'alt', label: 'Image Alt Text (for image type)' },
  { type: 'string', name: 'url', label: 'Link URL (for link type)' },
  { type: 'string', name: 'anchorWordId', label: 'Anchor Word ID', required: true },
  {
    type: 'object',
    name: 'position',
    label: 'Position',
    fields: positionFields,
  },
];

export default defineConfig({
  branch: '',
  clientId: '',
  token: '',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      publicFolder: 'public',
      mediaRoot: 'images',
    },
  },
  schema: {
    collections: [
      {
        name: 'verse',
        label: 'Verses',
        path: 'src/content/verses',
        format: 'json',
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => values?.slug || 'new-verse',
          },
        },
        fields: [
          { type: 'string', name: 'slug', label: 'Slug', required: true, isTitle: true },
          { type: 'string', name: 'title', label: 'Title', required: true },
          { type: 'string', name: 'artist', label: 'Artist', required: true },
          { type: 'string', name: 'album', label: 'Album' },
          { type: 'number', name: 'year', label: 'Year' },
          { type: 'string', name: 'backgroundColor', label: 'Background Color', required: true, ui: { component: 'color' } },
          { type: 'string', name: 'textColor', label: 'Text Color', required: true, ui: { component: 'color' } },
          { type: 'string', name: 'accentColor', label: 'Accent Color', required: true, ui: { component: 'color' } },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          {
            type: 'string',
            name: 'verseText',
            label: 'Verse Text',
            description: 'Enter the verse text. Each line on a new line. Words will be auto-split into the data model on save.',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'object',
            name: 'lines',
            label: 'Lines (auto-generated from Verse Text)',
            list: true,
            fields: [
              { type: 'number', name: 'lineIndex', label: 'Line Index', required: true },
              {
                type: 'object',
                name: 'words',
                label: 'Words',
                list: true,
                fields: [
                  { type: 'string', name: 'wordId', label: 'Word ID', required: true },
                  { type: 'string', name: 'text', label: 'Text', required: true },
                ],
              },
            ],
          },
          {
            type: 'object',
            name: 'analysisGroups',
            label: 'Analysis Groups',
            list: true,
            ui: {
              // @ts-ignore - TinaCMS custom field component
              component: AnnotationEditor,
            },
            fields: [
              { type: 'string', name: 'id', label: 'Group ID', required: true },
              { type: 'string', name: 'label', label: 'Label', required: true },
              { type: 'string', name: 'triggerWordIds', label: 'Trigger Word IDs', list: true },
              { type: 'string', name: 'highlightWordIds', label: 'Highlight Word IDs', list: true },
              {
                type: 'string',
                name: 'highlightType',
                label: 'Highlight Type',
                options: ['circle', 'underline', 'box', 'highlight'],
              },
              {
                type: 'object',
                name: 'connections',
                label: 'Connections',
                list: true,
                fields: [
                  { type: 'string', name: 'from', label: 'From Word ID', required: true },
                  { type: 'string', name: 'to', label: 'To Word ID', required: true },
                  { type: 'string', name: 'label', label: 'Label' },
                ],
              },
              {
                type: 'object',
                name: 'nodes',
                label: 'Analysis Nodes',
                list: true,
                fields: analysisNodeFields,
              },
            ],
          },
        ],
      },
    ],
  },
});
