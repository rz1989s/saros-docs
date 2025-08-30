import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'TypeScript SDK',
    Svg: require('@site/static/img/saros-sdk-architecture.svg').default,
    description: (
      <>
        Complete TypeScript SDK for Saros AMM, staking, and farming. 
        Build DeFi applications with type safety and modern JavaScript tooling.
        Includes <code>@saros-finance/sdk</code> with full AMM functionality.
      </>
    ),
  },
  {
    title: 'DLMM SDK',
    Svg: require('@site/static/img/dlmm-bins-visualization.svg').default,
    description: (
      <>
        Dynamic Liquidity Market Maker SDK for concentrated liquidity and 
        advanced trading strategies. Available in both TypeScript and Rust
        for maximum flexibility.
      </>
    ),
  },
  {
    title: 'Rust Performance',
    Svg: require('@site/static/img/swap-flow-diagram.svg').default,
    description: (
      <>
        High-performance Rust SDK implementing Jupiter's AMM trait for 
        seamless integration. Perfect for trading bots and 
        performance-critical applications.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
