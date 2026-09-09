<?php

namespace forumaker\MagicDice\Listener;

use Flarum\Post\Event\Saving;
use Flarum\Settings\SettingsRepositoryInterface;
use forumaker\MagicDice\Support\DiceRoller;
use Illuminate\Support\Arr;

class DiceSaving
{
    public function __construct(
        private readonly SettingsRepositoryInterface $settings,
        private readonly DiceRoller $roller
    ) {}

    public function handle(Saving $event): void
    {
        $attributes = Arr::get($event->data, 'attributes', []);

        if (!Arr::exists($attributes, 'content')) {
            return;
        }

        $existingRolls = [];

        if ($event->post->dice_rolls && !$this->settings->get('magic-dice.clearOnEdit')) {
            $existingRolls = array_filter(explode(',', $event->post->dice_rolls), 'strlen');
        }

        $content = Arr::get($attributes, 'content') ?? '';

        $event->post->dice_rolls = implode(',', $this->roller->roll($content, $existingRolls));
    }
}
