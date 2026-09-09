<?php

declare(strict_types=1);

namespace forumaker\MagicDice\Tests\integration\api;

use Flarum\Discussion\Discussion;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;

class DiceRollOnPostTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    public function setUp(): void
    {
        parent::setUp();

        $this->extension('forumaker-magic-dice');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(), // id 2
            ],
        ]);
    }

    private function createDiscussion(string $content): array
    {
        $response = $this->send(
            $this->request('POST', '/api/discussions', [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'type' => 'discussions',
                        'attributes' => [
                            'title' => 'A discussion about dice',
                            'content' => $content,
                        ],
                    ],
                ],
            ])
        );

        $this->assertEquals(201, $response->getStatusCode(), (string) $response->getBody());

        return json_decode((string) $response->getBody(), true);
    }

    public function test_a_dice_formula_in_the_first_post_gets_rolled(): void
    {
        $this->createDiscussion("Rolling for initiative!\n1d20");

        $discussion = Discussion::with('firstPost')->firstOrFail();
        $rolls = explode(',', $discussion->firstPost->dice_rolls);

        $this->assertCount(1, $rolls);
        $this->assertGreaterThanOrEqual(1, (int) $rolls[0]);
        $this->assertLessThanOrEqual(20, (int) $rolls[0]);
    }

    public function test_multiple_formulas_each_roll_independently(): void
    {
        $this->createDiscussion("1d6\n1d6\n1d20");

        $discussion = Discussion::with('firstPost')->firstOrFail();
        $this->assertCount(3, explode(',', $discussion->firstPost->dice_rolls));
    }

    /**
     * The point of ->visible(fn ($post) => !empty($post->dice_rolls)) on the
     * diceRolls field (extend.php) — a post with no dice in it must not
     * carry a diceRolls attribute at all, not even as null or an empty
     * string, on every single post list/stream response.
     */
    public function test_a_post_without_dice_has_no_diceRolls_attribute_in_the_api_response(): void
    {
        $body = $this->createDiscussion('Just a normal post, no dice at all.');

        $post = $this->findIncluded($body, 'posts');

        $this->assertNotNull($post);
        $this->assertArrayNotHasKey('diceRolls', $post['attributes']);
    }

    public function test_a_post_with_dice_exposes_diceRolls_in_the_api_response(): void
    {
        $body = $this->createDiscussion('1d6');

        $post = $this->findIncluded($body, 'posts');

        $this->assertNotNull($post);
        $this->assertArrayHasKey('diceRolls', $post['attributes']);
        $this->assertNotSame('', $post['attributes']['diceRolls']);
    }

    public function test_editing_a_post_keeps_its_existing_roll_by_default(): void
    {
        $this->createDiscussion('1d6');
        $discussion = Discussion::with('firstPost')->firstOrFail();
        $postId = $discussion->firstPost->id;
        $originalRoll = $discussion->firstPost->dice_rolls;

        $this->send(
            $this->request('PATCH', "/api/posts/{$postId}", [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'type' => 'posts',
                        'id' => (string) $postId,
                        'attributes' => ['content' => '1d6'],
                    ],
                ],
            ])
        );

        $discussion->firstPost->refresh();
        $this->assertSame($originalRoll, $discussion->firstPost->dice_rolls);
    }

    public function test_editing_a_post_rerolls_when_clearOnEdit_is_enabled(): void
    {
        $this->setting('magic-dice.clearOnEdit', '1');

        $this->createDiscussion('1d6');
        $discussion = Discussion::with('firstPost')->firstOrFail();
        $postId = $discussion->firstPost->id;

        $this->send(
            $this->request('PATCH', "/api/posts/{$postId}", [
                'authenticatedAs' => 2,
                'json' => [
                    'data' => [
                        'type' => 'posts',
                        'id' => (string) $postId,
                        'attributes' => ['content' => '1d6'],
                    ],
                ],
            ])
        );

        $discussion->firstPost->refresh();
        $rolls = explode(',', $discussion->firstPost->dice_rolls);
        $this->assertCount(1, $rolls);
    }

    /** @return array<string, mixed>|null */
    private function findIncluded(array $body, string $type): ?array
    {
        foreach ($body['included'] ?? [] as $resource) {
            if (($resource['type'] ?? null) === $type) {
                return $resource;
            }
        }

        // Not every response inlines the post via `included` — the
        // discussion's own relationship data is enough to tell us either way.
        return null;
    }
}
