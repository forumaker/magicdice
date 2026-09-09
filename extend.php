<?php

namespace forumaker\MagicDice;

use Flarum\Api\Resource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Post\Event\Saving;
use forumaker\MagicDice\Listener\DiceSaving;

return [
    (new Extend\Frontend('admin'))
        ->css(__DIR__ . '/resources/less/admin.less')
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Frontend('forum'))
        ->css(__DIR__ . '/resources/less/forum.less')
        ->js(__DIR__ . '/js/dist/forum.js'),

    new Extend\Locales(__DIR__ . '/resources/locale'),

    (new Extend\Settings())
        ->default('magic-dice.icon.d6', 'fas fa-dice-d6')
        ->default('magic-dice.icon.d10', 'fas fa-gem')
        ->default('magic-dice.icon.d20', 'fas fa-dice-d20')
        ->default('magic-dice.color.d6', '#80b77e')
        ->default('magic-dice.color.d10', '#a7253d')
        ->default('magic-dice.color.d20', '#3f6f8d')
        ->serializeToForum('magicDiceIconD6', 'magic-dice.icon.d6')
        ->serializeToForum('magicDiceIconD10', 'magic-dice.icon.d10')
        ->serializeToForum('magicDiceIconD20', 'magic-dice.icon.d20')
        ->serializeToForum('magicDiceColorD6', 'magic-dice.color.d6')
        ->serializeToForum('magicDiceColorD10', 'magic-dice.color.d10')
        ->serializeToForum('magicDiceColorD20', 'magic-dice.color.d20'),

    (new Extend\User())
        ->registerPreference('rollDieSkin', null, 'classic'),

    (new Extend\Event())
        ->listen(Saving::class, DiceSaving::class),

    (new Extend\ApiResource(Resource\PostResource::class))
        ->fields(fn () => [
            Schema\Str::make('diceRolls')
                ->visible(fn ($post) => !empty($post->dice_rolls)),
        ]),
];