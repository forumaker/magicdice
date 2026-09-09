<?php

declare(strict_types=1);

namespace forumaker\MagicDice\Tests\unit;

use forumaker\MagicDice\Support\DiceRoller;
use PHPUnit\Framework\TestCase;

class DiceRollerTest extends TestCase
{
    private DiceRoller $roller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->roller = new DiceRoller();
    }

    public function test_no_formulas_means_no_rolls(): void
    {
        $this->assertSame([], $this->roller->roll("Just some regular text.\nNothing to see here."));
    }

    public function test_a_single_formula_rolls_once_within_range(): void
    {
        $rolls = $this->roller->roll("1d6");

        $this->assertCount(1, $rolls);
        $this->assertGreaterThanOrEqual(1, (int) $rolls[0]);
        $this->assertLessThanOrEqual(6, (int) $rolls[0]);
    }

    public function test_multiple_formulas_on_separate_lines_each_roll(): void
    {
        $rolls = $this->roller->roll("1d6\n1d20\n2d10");

        $this->assertCount(3, $rolls);
    }

    /**
     * A formula must own its whole line, matching exactly what the composer
     * toolbar itself inserts — text before or after it on the same line
     * means it's not a roll request, just someone typing "1d6" in a
     * sentence.
     */
    public function test_a_formula_embedded_in_a_sentence_does_not_roll(): void
    {
        $this->assertSame([], $this->roller->roll('The rules say roll 1d6 for this.'));
        $this->assertSame([], $this->roller->roll("1d6 please\nthanks"));
    }

    public function test_a_quoted_formula_line_still_rolls(): void
    {
        $rolls = $this->roller->roll('> 1d20');

        $this->assertCount(1, $rolls);
    }

    /**
     * The leading count digit in "NdM" (e.g. the "2" in "2d6") is matched
     * but never actually used as a multiplier — the composer toolbar always
     * expands a multi-die pick into that many separate "1dM" lines (see
     * DicePickerPopover.tsx's onPick), so one line is always exactly one
     * roll, whatever count prefix happens to be written on it.
     */
    public function test_sides_below_two_fall_back_to_a_d6(): void
    {
        $rolls = $this->roller->roll("1d0\n1d1");

        $this->assertCount(2, $rolls);
        foreach ($rolls as $roll) {
            $this->assertGreaterThanOrEqual(1, (int) $roll);
            $this->assertLessThanOrEqual(6, (int) $roll);
        }
    }

    public function test_sides_above_a_hundred_are_capped(): void
    {
        $rolls = $this->roller->roll('1d999');

        $this->assertCount(1, $rolls);
        $this->assertLessThanOrEqual(100, (int) $rolls[0]);
    }

    public function test_rolls_are_capped_at_max_rolls(): void
    {
        $content = implode("\n", array_fill(0, DiceRoller::MAX_ROLLS + 10, '1d6'));

        $this->assertCount(DiceRoller::MAX_ROLLS, $this->roller->roll($content));
    }

    /**
     * The whole reason $existingRolls exists: on an edit, formulas already
     * rolled the first time keep their value instead of being re-rolled —
     * only formulas beyond the count already covered get a fresh roll.
     */
    public function test_existing_rolls_are_kept_and_only_new_formulas_roll(): void
    {
        $rolls = $this->roller->roll("1d6\n1d20\n1d10", ['4', '17']);

        $this->assertCount(3, $rolls);
        $this->assertSame('4', $rolls[0]);
        $this->assertSame('17', $rolls[1]);
        $this->assertGreaterThanOrEqual(1, (int) $rolls[2]);
        $this->assertLessThanOrEqual(10, (int) $rolls[2]);
    }

    public function test_existing_rolls_covering_every_formula_means_no_new_rolls(): void
    {
        $rolls = $this->roller->roll("1d6\n1d20", ['4', '17']);

        $this->assertSame(['4', '17'], $rolls);
    }
}
