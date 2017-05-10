const rollup = require('rollup');
const babel = require('rollup-plugin-babel');

rollup.rollup({
    entry: 'src/index.js',
    plugins: [babel({babelrc: false, presets: ['babel-preset-es2015-rollup']})],
}).then(function (bundle) {
    bundle.write({
        dest: 'dist/index.js',
        format: 'umd',
        moduleName: 'resistopia-reactor-simulation',
    });
});
