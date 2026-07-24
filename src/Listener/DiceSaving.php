<?php

namespace forumaker\MagicDice\Listener;

use Flarum\Post\Event\Saving;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Support\Arr;

class DiceSaving
{
    private const MAX_ROLLS = 60;

    public function __construct(
        private readonly SettingsRepositoryInterface $settings
    ) {}

    public function handle(Saving $event): void
    {
        $attributes = Arr::get($event->data, 'attributes', []);

        if (!Arr::exists($attributes, 'content')) {
            return;
        }

        $rolls = [];

        if ($event->post->dice_rolls && !$this->settings->get('magic-dice.clearOnEdit')) {
            $existing = array_filter(explode(',', $event->post->dice_rolls), 'strlen');
            $rolls = array_slice(array_values($existing), 0, self::MAX_ROLLS);
        }

        $content = Arr::get($attributes, 'content') ?? '';

        preg_match_all(
            '~(?:^|[\n\r])(>\s*)?(\d+)d(\d+)(?=[\n\r]|$)~',
            $content,
            $matches,
            PREG_SET_ORDER
        );

        $numberOfRolls = min(count($matches), self::MAX_ROLLS);

        for ($i = count($rolls); $i < $numberOfRolls; $i++) {
            $match = $matches[$i];

            $sides = (int) $match[3];

            if ($sides < 2) {
                $sides = 6;
            }

            if ($sides > 100) {
                $sides = 100;
            }

            $rolls[] = (string) random_int(1, $sides);
        }

        $event->post->dice_rolls = implode(',', $rolls);
    }
}
