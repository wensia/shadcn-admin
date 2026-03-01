import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['src/routeTree.gen.ts'],
  ignoreDependencies: ['tailwindcss', 'tw-animate-css'],
};

export default config;
