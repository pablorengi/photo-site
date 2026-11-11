import { defineField, defineType } from 'sanity';

export const photo = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      description:
        'When this photo was published to the portfolio. Controls ordering on the site. Not the capture date.',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'The year the photo was taken.',
      validation: (rule) => rule.integer().min(1826).max(new Date().getFullYear()),
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'person' }] }],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'camera',
      title: 'Camera',
      type: 'string',
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
      options: {
        list: [
          { title: 'Film', value: 'film' },
          { title: 'Digital', value: 'digital' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: [
          { title: '35mm', value: '35mm' },
          { title: '120', value: '120' },
        ],
        layout: 'radio',
      },
      hidden: ({ parent }) => parent?.medium !== 'film',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { medium?: string } | undefined;
          if (parent?.medium === 'film' && !value) {
            return 'Format is required for film photos';
          }
          return true;
        }),
    }),
    defineField({
      name: 'filmStock',
      title: 'Film Stock',
      type: 'string',
      description: 'e.g. Ektachrome, Portra 400, Tri-X',
      hidden: ({ parent }) => parent?.medium !== 'film',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Where the photo was taken, e.g. Pontevedra',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
    },
  },
});
