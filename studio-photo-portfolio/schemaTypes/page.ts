import { defineArrayMember, defineField, defineType } from 'sanity';

/** Simple text pages such as About and Contact, served at /<slug>. */
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Use "about" and "contact" for the pages linked in the header.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) =>
        rule.required().custom((slug) => {
          const reserved = ['photos', 'api', 'studio'];
          return slug?.current && reserved.includes(slug.current)
            ? `"${slug.current}" is used by the site itself`
            : true;
        }),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Quote', value: 'blockquote' },
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', media: 'image' },
    prepare: ({ title, slug, media }) => ({
      title,
      subtitle: slug ? `/${slug}` : undefined,
      media,
    }),
  },
});
