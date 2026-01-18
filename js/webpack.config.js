const config = require('flarum-webpack-config')
const path = require('path')

const baseConfig = config()

module.exports = {
  ...baseConfig,
  resolve: {
    ...baseConfig.resolve,
    alias: {
      ...(baseConfig.resolve?.alias || {}),
      // 关键：强制使用 ESM 版本，确保存在 named exports: marked / Marked
      'marked$': path.resolve(__dirname, 'node_modules/marked/lib/marked.esm.js'),
    },
  },
}
