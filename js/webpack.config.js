const config = require('flarum-webpack-config');

const base = config();

base.resolve = base.resolve || {};
base.resolve.alias = {
  ...(base.resolve.alias || {}),
  // 关键：指向“入口文件”，不要指向目录
  // 用 require.resolve 走 Node 的解析（通常会拿到可 exports 的 CJS/ESM 入口）
  'marked$': require.resolve('marked'),
};

module.exports = base;
