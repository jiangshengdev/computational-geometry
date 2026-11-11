import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import teachingColors, {teachingMath} from './teaching-colors';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const chinese = process.env.DOCUSAURUS_CURRENT_LOCALE === 'zh-Hans';

const config: Config = {
  title: chinese ? '计算几何文档' : 'Computational Geometry',
  tagline: chinese ? '理解计算几何算法背后的数学' : 'Understand the mathematics behind computational geometry algorithms',

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
  onBrokenAnchors: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  plugins: [teachingColors],

  // English is the default display language; Chinese remains the authoring source.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {en: {label: 'English'}, 'zh-Hans': {label: '简体中文'}},
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [[rehypeKatex, teachingMath]],
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
      title: 'Computational Geometry',
      items: [
        {type: 'localeDropdown', position: 'right'},
        {
          to: '/chapters/convex-hull/',
          activeBaseRegex: '^/(?:zh-Hans/)?(chapters/convex-hull|docs/determinant-orientation)(/|$)',
          position: 'left',
          label: 'Convex hulls',
        },
        {
          to: '/chapters/segment-intersection/',
          activeBaseRegex: '^/(?:zh-Hans/)?(chapters/segment-intersection|docs/segment-intersection|docs/line-equation|docs/shear-[^/]+)(/|$)',
          position: 'left',
          label: 'Segment intersection',
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
          title: 'Chapters',
          items: [
            {
              label: 'Home',
              to: '/',
            },
            {
              label: 'Convex hulls',
              to: '/chapters/convex-hull/',
            },
            {
              label: 'Segment intersection',
              to: '/chapters/segment-intersection/',
            },
          ],
        },
        {
          title: 'Project',
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
