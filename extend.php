<?php

/**
 * Lady Byron Editor - Tiptap V3 WYSIWYG Editor for Flarum
 */

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    new Extend\Locales(__DIR__.'/locale'),
];
