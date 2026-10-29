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
  const base = useBaseUrl(`/img/segment-intersection/${topic}/`);
  const indexed = panels.map((alt, index) => ({alt, index}));
  const groups = comparison
    ? Array.from({length: Math.ceil(indexed.length / 2)}, (_, i) => indexed.slice(i * 2, i * 2 + 2))
    : [indexed];

  return (
    <div className={styles.figures}>
      {groups.map((group, groupIndex) => (
        <div className={styles.row} key={groupIndex} role="group"
          aria-label={comparison ? `第 ${groupIndex + 1} 组：加入 C 前后对照` : '按顺序阅读子图'}>
          {group.map(({alt, index}) => (
            <figure className={styles.panel} key={index}>
              {comparison ? <figcaption className={styles.caption}>{index % 2 === 0 ? '加入 C 前' : '加入 C 后'}</figcaption> : null}
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
