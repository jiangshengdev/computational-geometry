import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  documents: [
    {
      type: 'category',
      label: 'Convex hulls',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/chapters/convex-hull',
        description: 'Understand orientation tests and the mathematics behind convex hull algorithms.',
      },
      items: ['convex-hull/determinant-orientation'],
    },
    {
      type: 'category',
      label: 'Segment intersection',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/chapters/segment-intersection',
        description: 'Start with the intersection result, then explore sweeps, coordinate transformations, and exact computation.',
      },
      items: [
        'segment-intersection/what-we-compute',
        'segment-intersection/why-neighbors',
        'segment-intersection/why-neighbors-proof',
        'segment-intersection/exact-predicates',
        'segment-intersection/same-point-events',
        'segment-intersection/overlapping-segments',
        'segment-intersection/same-x-events',
        'segment-intersection/vertical-segments',
        'segment-intersection/line-equation',
        {
          type: 'category',
          label: 'Choosing and proving a shear coefficient',
          link: {type: 'doc', id: 'segment-intersection/shear/shear-coefficient'},
          items: [
            'segment-intersection/shear/shear-intuition',
            'segment-intersection/shear/shear-denominator',
            'segment-intersection/shear/shear-order',
            'segment-intersection/shear/shear-special-cases',
            'segment-intersection/shear/shear-intersection',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
