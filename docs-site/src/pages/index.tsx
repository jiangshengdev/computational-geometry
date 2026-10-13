import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="首页"
      description="精确线段求交的数学证明与阅读资料，从剪切系数的选择开始。">
      <main className="container margin-vert--lg">
        <Heading as="h1">{siteConfig.title}</Heading>
        <p>{siteConfig.tagline}</p>
        <Heading as="h2">从这里开始</Heading>
        <p>剪切变换怎样保持精确交集，又怎样用一个足够小的系数保持扫描事件的顺序？</p>
        <Link to="/docs/shear-coefficient/">阅读剪切系数的选择与证明</Link>
      </main>
    </Layout>
  );
}
