import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {translate} from '@docusaurus/Translate';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

type Props = {
  name: string;
  panels: readonly string[];
  comparison?: boolean;
  topic?: string;
  prefix?: string;
};

export default function IntersectionFigures({name, panels, comparison = false, topic = 'what-we-compute', prefix = 'intersection-goals'}: Props) {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const localized = currentLocale === 'zh-Hans' ? 'zh-Hans/' : '';
  const base = useBaseUrl(`/img/${localized}segment-intersection/${topic}/`);
  const indexed = panels.map((alt, index) => ({alt, index}));
  const groups = comparison
    ? Array.from({length: Math.ceil(indexed.length / 2)}, (_, i) => indexed.slice(i * 2, i * 2 + 2))
    : [indexed];

  return (
    <div className={styles.figures}>
      {groups.map((group, groupIndex) => (
        <div className={styles.row} key={groupIndex} role="group"
          aria-label={comparison ? translate({id: 'figures.comparisonGroup', message: 'Group {number}: before and after adding C'}, {number: groupIndex + 1}) : translate({id: 'figures.readingOrder', message: 'Read the panels in order'})}>
          {group.map(({alt, index}) => (
            <figure className={styles.panel} key={index}>
              {comparison ? <figcaption className={styles.caption}>{index % 2 === 0 ? translate({id: 'figures.before', message: 'Before adding C'}) : translate({id: 'figures.after', message: 'After adding C'})}</figcaption> : null}
              <ThemedImage
                className={styles.image}
                alt={alt}
                width={320}
                height={260}
                sources={{
                  light: `${base}light/${prefix}-${name}-${index + 1}-light.svg`,
                  dark: `${base}dark/${prefix}-${name}-${index + 1}-dark.svg`,
                }}
              />
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}
