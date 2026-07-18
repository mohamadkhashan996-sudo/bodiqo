# Feed module

Timelines, ranking, reactions, and post lifecycle.

## Modes (`GET /api/posts?mode=`)

| Mode        | Behavior                                         |
| ----------- | ------------------------------------------------ |
| `home`      | Hybrid public + following + self (chronological) |
| `following` | Only people you follow (+ you)                   |
| `latest`    | Public chronological discovery                   |
| `trending`  | 14-day window, engagement × recency ranking      |
| `foryou`    | Ranked discovery with interest affinity          |

Trending/explore responses are Redis-backed (or in-memory) for ~30–45s.
`rank.ts` scores likes, comments, shares, bookmarks, recency, and affinity.
