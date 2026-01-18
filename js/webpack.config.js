// js/webpack.config.js
const config = require('flarum-webpack-config');
const { merge } = require('webpack-merge');

module.exports = merge(config(), {
  resolve: {
    alias: {
      // 关键：强制走 ESM 入口，确保有 named exports（marked / Marked 等）
      'marked$': require.resolve('marked/lib/marked.esm.js'),
    },

    // 可选但很有用：避免优先挑 browser/umd
    mainFields: ['module', 'main'],
  },
});
