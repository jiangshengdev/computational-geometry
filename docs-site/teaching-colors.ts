import type {Plugin} from '@docusaurus/types';
import type {KatexOptions} from 'katex';
import project from '../shared/colors/project.json';

// Authors select occurrences explicitly; a letter has no site-wide color.
// MDX math: \teachBlue{y_A(x)}. Prose: <span className="teaching-blue">…</span>.
// Keep relation signs outside color groups and use accents only at teaching landmarks.
const names = Object.keys(project.light).filter((name) => !['background', 'text', 'axis'].includes(name));
const classes = new Set(names.map((name) => `teaching-${name}`));

export const teachingMath: KatexOptions = {
  throwOnError: true,
  // Only the named teaching classes are trusted; other HTML commands stay disabled.
  trust: (context) => context.command === '\\htmlClass' && classes.has(context.class),
  strict: (code) => code === 'htmlExtension' ? 'ignore' : 'error',
  macros: Object.fromEntries(names.map((name) => [
    `\\teach${name[0].toUpperCase()}${name.slice(1)}`,
    `\\htmlClass{teaching-${name}}{#1}`,
  ])),
};

/** Both static HTML and client navigation use the same theme-aware classes. */
export default function teachingColors(): Plugin {
  return {
    name: 'teaching-colors',
    injectHtmlTags() {
      const css = Object.entries(project).map(([theme, palette]) => {
        const selector = theme === 'light' ? ':root' : '[data-theme="dark"]';
        return `${selector}{${names.map((name) => `--teaching-${name}:${palette[name as keyof typeof palette]}`).join(';')}}`;
      }).join('\n') + '\n' + names.map((name) => `.teaching-${name}{color:var(--teaching-${name})}`).join('\n');
      return {headTags: [{tagName: 'style', attributes: {id: 'teaching-colors'}, innerHTML: css}]};
    },
  };
}
