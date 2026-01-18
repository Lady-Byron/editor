<?php

use Flarum\Extend;
use s9e\TextFormatter\Configurator;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    new Extend\Locales(__DIR__.'/resources/locale'),

    // BBCode 定义 - 用于后端渲染帖子内容
    (new Extend\Formatter)->configure(function (Configurator $config) {
        // 空白行 - 块级占位
        $config->BBCodes->addCustom(
            '[lb-blank]{TEXT}[/lb-blank]',
            '<div class="lb-blank"></div>'
        );

        // 空白格 - 行内占位（每个 1em 宽度）
        $config->BBCodes->addCustom(
            '[lb-i]',
            '<span class="lb-i">&#160;</span>'
        );
    }),
];
