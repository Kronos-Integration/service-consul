import pkg from './package.json';

export default {
  plugins: [],
  external: ['model-attributes', 'kronos-endpoint', 'kronos-service'],
  input: pkg.module,

  output: {
    format: 'cjs',
    file: pkg.main
  }
};
