/*

Rollup.js config file.
https://rollupjs.org/guide/en#big-list-of-options
https://rollupjs.org/guide/en#es-module-syntax
https://rollupjs.org/guide/en#tools


  import pkg from "./package.json";
  import ttd from "./t.json";
  var ttd = require('./t.json');
  var pkg = require('./package.json');
 
*/

export default {
    input: './javascript/core/rollup_exports.js',
    output: {
        //globals: 'newMap',
        format: 'umd',
        name: 'NewMap', // TODO: Change this name.
        sourcemap: 'inline',
        // extend : true,
        file: './dist/bundle.js',
        //intro: "/* Fancy new Intdro! "+ ttd.version +" */",
        outro: '/* Fancy new Rollup.js outro! */ window.NewMap = exports;',
        banner: '/* Fancy new Rollup.js banner! */\n',
        // footer: '\n /* Fancy new Footer! */',
    },
};
