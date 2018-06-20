module.exports = {
  entry: 'src/main.js',
  targets: [
    {dest: './build/bundle.js', format: 'iife'}
  ],
  plugins: [
    require('rollup-plugin-node-resolve')(),
    require('rollup-plugin-commonjs')(),
    require('rollup-plugin-uglify')(),
    require('rollup-plugin-node-builtins')(),
    require('rollup-plugin-node-globals')()
  ],
  sourceMap: true,
  sourceMapFile: 'bundle.map.js'
};
