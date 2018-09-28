import json from "rollup-plugin-json";
import cleanup from 'rollup-plugin-cleanup';
import executable from 'rollup-plugin-executable';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
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
