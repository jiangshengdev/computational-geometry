import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '计算几何文档',
  tagline: '理解计算几何算法背后的数学',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://cgd.jiangshengdev.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  trailingSlash: true,

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [[rehypeKatex, {strict: 'error', throwOnError: true}]],
        },
        blog: false,
        theme: {
          customCss: [require.resolve('katex/dist/katex.min.css'), './src/css/custom.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '计算几何',
      items: [
        {
          to: '/chapters/convex-hull/',
          activeBaseRegex: '^/(chapters/convex-hull|docs/determinant-orientation)(/|$)',
          position: 'left',
          label: '凸包',
        },
        {
          to: '/chapters/segment-intersection/',
          activeBaseRegex: '^/(chapters/segment-intersection|docs/shear-coefficient)(/|$)',
          position: 'left',
          label: '线段求交',
        },
        {
          href: 'https://github.com/jiangshengdev/computational-geometry',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://cnb.cool/jiangshengdev/computational-geometry',
          label: 'CNB',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '章节',
          items: [
            {
              label: '首页',
              to: '/',
            },
            {
              label: '凸包',
              to: '/chapters/convex-hull/',
            },
            {
              label: '线段求交',
              to: '/chapters/segment-intersection/',
            },
          ],
        },
        {
          title: '项目',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/jiangshengdev/computational-geometry',
            },
            {
              label: 'CNB',
              href: 'https://cnb.cool/jiangshengdev/computational-geometry',
            },
            {
              label: 'Docusaurus',
              href: 'https://docusaurus.io',
            },
          ],
        },
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
