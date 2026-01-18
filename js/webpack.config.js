// js/webpack.config.js
const config = require('flarum-webpack-config');
const path = require('path');

const baseConfig = config();

// ✅ 通过导出的子路径定位包根
const markedRoot = path.dirname(require.resolve('marked/package.json'));
// ✅ 直接拼出 esm 文件（无需 require.resolve 子路径）
const markedEsm = path.join(markedRoot, 'lib', 'marked.esm.js');

module.exports = {
  ...baseConfig,
  resolve: {
    ...baseConfig.resolve,
    alias: {
      ...(baseConfig.resolve?.alias || {}),
      // 只替换裸导入：import ... from 'marked'
      'marked$': markedEsm,
    },
  },
};
