<?php

namespace forumaker\MagicDice\Support;

/**
 * Finds every standalone `NdM` formula in a post's content and rolls each
 * one not already covered by a previous roll.
 *
 * Pulled out of DiceSaving as its own class specifically so it can be unit
 * tested without going through a real Saving event/Post model — see
 * tests/unit/DiceRollerTest.php.
 */
class DiceRoller
{
    public const MAX_ROLLS = 60;

    /**
     * A formula must own its whole line — no other text before or after —
     * matching exactly what the composer toolbar itself inserts
     * (DicePickerPopover.tsx's editor.insertAtCursor calls). An optional
     * leading blockquote marker ("> 1d20") is allowed, since a quoted reply
     * containing a roll line still counts.
     */
    private const FORMULA_PATTERN = '~(?:^|[\n\r])(>\s*)?(\d+)d(\d+)(?=[\n\r]|$)~';

    /**
     * @param string[] $existingRolls Rolls already made for earlier formulas
     *                                 in this same post, kept as-is (not
     *                                 re-rolled) — the caller decides
     *                                 whether that's an empty array (fresh
     *                                 roll for every formula) or the post's
     *                                 previous dice_rolls (only new formulas
     *                                 beyond that count get rolled).
     * @return string[] $existingRolls plus a fresh roll for every formula
     *                   beyond that count, capped at MAX_ROLLS total.
     */
    public function roll(string $content, array $existingRolls = []): array
    {
        preg_match_all(self::FORMULA_PATTERN, $content, $matches, PREG_SET_ORDER);

        $rolls = array_slice(array_values($existingRolls), 0, self::MAX_ROLLS);
        $numberOfRolls = min(count($matches), self::MAX_ROLLS);

        for ($i = count($rolls); $i < $numberOfRolls; $i++) {
            $rolls[] = (string) random_int(1, $this->clampSides((int) $matches[$i][3]));
        }

        return $rolls;
    }

    /** Below 2 sides isn't a real die — falls back to a d6. Above 100 is capped, mainly to keep an absurd formula from blocking on random_int's own bounds. */
    private function clampSides(int $sides): int
    {
        if ($sides < 2) {
            return 6;
        }

        if ($sides > 100) {
            return 100;
        }

        return $sides;
    }
}
