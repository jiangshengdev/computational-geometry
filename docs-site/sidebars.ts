import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  documents: [
    {
      type: 'category',
      label: '文档',
      link: {type: 'doc', id: 'index'},
      items: ['shear-coefficient'],
    },
  ],
};

export default sidebars;
