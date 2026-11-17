import { defineArrayMember, defineField, defineType } from 'sanity';

/** Singleton: one document with id "siteSettings" (see sanity.config.ts). */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'home', title: 'Home page', default: true },
    { name: 'site', title: 'Site & links' },
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      description: 'Shown top left in the header and in browser tabs.',
      group: 'site',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Home title',
      type: 'string',
      description: 'The large heading at the top of the home page.',
      group: 'home',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: { hotspot: true },
      group: 'home',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the image for screen readers.',
        }),
      ],
    }),
    defineField({
      name: 'byline',
      title: 'Byline',
      type: 'string',
      description: 'Short line under the hero, e.g. "Photographs by …".',
      group: 'home',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 4,
      description: 'A short paragraph under the byline. Links to the About page.',
      group: 'home',
    }),
    defineField({
      name: 'seriesTitle',
      title: 'Series title',
      type: 'string',
      description: 'Heading above the photo grid.',
      group: 'home',
    }),
    defineField({
      name: 'seriesDescription',
      title: 'Series description',
      type: 'text',
      rows: 3,
      group: 'home',
    }),
    defineField({
      name: 'featuredPhotos',
      title: 'Featured photos',
      type: 'array',
      description:
        'Photos shown in the home grid, in this order. Leave empty to show all photos, newest first.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'photo' }] })],
      validation: (rule) => rule.unique(),
      group: 'home',
    }),
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      group: 'site',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      group: 'site',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'e.g. Instagram',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (rule) => rule.required().uri({ scheme: ['https', 'http', 'mailto'] }),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'url' } },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});
