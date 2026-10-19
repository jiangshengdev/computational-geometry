import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  documents: [
    {
      type: 'category',
      label: '凸包',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/chapters/convex-hull',
        description: '理解凸包算法中的方向判断与数学原理。',
      },
      items: ['determinant-orientation'],
    },
    {
      type: 'category',
      label: '线段求交',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/chapters/segment-intersection',
        description: '理解扫描线求交中的坐标变换与精确计算。',
      },
      items: [
        {
          type: 'category',
          label: '剪切系数的选择与证明',
          link: {type: 'doc', id: 'shear-coefficient'},
          items: [
            'shear-intuition',
            'shear-denominator',
            'shear-order',
            'shear-special-cases',
            'shear-intersection',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
