<?php

use Flarum\Extend;
use s9e\TextFormatter\Configurator;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    new Extend\Locales(__DIR__.'/resources/locale'),

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

        // 文本对齐 - 右对齐（Flarum 原生不支持）
        $config->BBCodes->addCustom(
            '[right]{TEXT}[/right]',
            '<div class="aligned-block" data-align="right" style="text-align: right">{TEXT}</div>'
        );

        // 注意：[center] 由 Flarum 原生 flarum/bbcode 扩展支持，无需重复定义
        // 注意：[left] 已移除，因为左对齐是默认状态
    }),
];
