const config = require('flarum-webpack-config');
const path = require('path');

const baseConfig = config();

module.exports = {
    ...baseConfig,
    resolve: {
        ...baseConfig.resolve,
        alias: {
            ...baseConfig.resolve?.alias,
            // 强制 marked 解析到项目的 node_modules/marked，
            // 解决 @tiptap/markdown 内置旧版 Marked 的 em/strong 解析 bug
            'marked': path.resolve(__dirname, 'node_modules/marked'),
        },
    },
};
