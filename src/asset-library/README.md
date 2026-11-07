# Asset Library System

Composable asset management for consistent video production.

## Architecture

### Composable Asset System

Instead of pre-generating all combinations (2 chars × 4 poses × 6 emotions = 48 combinations), we store:

- **Character identities:** 2 base characters (ancient_man, modern_man)
- **Pose variants:** 4 poses per character (standing, running, sitting, jumping)
- **Emotion overlays:** 6 emotions per character (neutral, happy, angry, sad, surprised, determined)
- **Props:** 15 reusable items (spear, phone, fire, etc.)
- **Backgrounds:** 10 scenes (forest, cave, city, etc.)
- **Effects:** 10 SVG overlays (arrow, question, etc.)

**Total:** ~47 composable assets vs 67-83 pre-generated combinations

### Runtime Composition

```
Request: character=ancient_man, pose=running, emotion=determined

Composition:
  1. Load identity: ancient_man_identity.png
  2. Load pose: ancient_man/poses/running.png
  3. Load emotion: ancient_man/emotions/determined.png
  4. Composite layers → final image
```

## Directory Structure

```
assets/
├── characters/
│   ├── ancient_man/
│   │   ├── identity_v1.png          # Base character
│   │   ├── schema_version.json      # Metadata
│   │   ├── poses/
│   │   │   ├── standing.png
│   │   │   ├── running.png
│   │   │   ├── sitting.png
│   │   │   └── jumping.png
│   │   └── emotions/
│   │       ├── neutral.png
│   │       ├── happy.png
│   │       ├── angry.png
│   │       ├── sad.png
│   │       ├── surprised.png
│   │       └── determined.png
│   └── modern_man/
│       ├── identity_v1.png
│       ├── schema_version.json
│       ├── poses/
│       └── emotions/
├── props/
│   ├── spear.png
│   ├── phone.png
│   ├── fire.png
│   └── ... (15 total)
├── backgrounds/
│   ├── forest.png
│   ├── cave.png
│   ├── city.png
│   └── ... (10 total)
├── effects/
│   ├── arrow.svg
│   ├── question.svg
│   └── ... (10 total)
└── metadata/
    ├── assets.json              # Asset registry
    └── embeddings.json          # Semantic search cache
```

## Asset Metadata Schema

```json
{
  "asset_id": "ancient_man_identity_v1",
  "asset_type": "character_identity",
  "character_id": "ancient_man",
  "pose": null,
  "emotion": null,
  "visual_description": "Caveman with wild hair, tattered animal skin clothing",
  "file_path": "assets/characters/ancient_man/identity_v1.png",
  "style_parameters": {
    "ink_style": "clean_line",
    "color_palette": ["#000000", "#FFFFFF", "#8B4513"],
    "line_weight": 3,
    "resolution": "1920x1080"
  },
  "metadata": {
    "creation_date": "2026-09-09T10:00:00Z",
    "usage_count": 42,
    "variants": ["pose:running", "emotion:determined"]
  },
  "schema_version": "1.0.0"
}
```

## Matching Algorithm

### 1. Metadata Filtering (Primary)

```sql
SELECT * FROM assets 
WHERE asset_type = 'character_identity'
  AND character_id = 'ancient_man'
  AND (pose = 'running' OR pose IS NULL)
  AND (emotion = 'determined' OR emotion IS NULL);
```

Fast metadata lookup in PostgreSQL for exact matches.

### 2. Semantic Fallback (Secondary)

If no metadata match:
1. Compute embedding of visual description
2. Search embeddings with cosine similarity
3. Return if similarity > 0.85
4. Otherwise, generate new asset

## Style Consistency

All generated assets must match:

- **Ink style:** clean_line (Simple History / Doodle style)
- **Color palette:** Limited colors (black, white, earth tones)
- **Line weight:** 2-4px (consistent thickness)
- **Resolution:** 1920x1080 (landscape master)
- **Background:** White or transparent
- **Character scale:** Consistent proportions

## Asset Generation

When no match found:

```javascript
const prompt = `
Simple History doodle style illustration.
Character: ${character_id}
Pose: ${pose}
Emotion: ${emotion}
Style: Thick black ink lines, clean line art, white background.
No photorealism. Exaggerated facial expression.
Single character only.
1920x1080 landscape.
`;

const imageUrl = await generateAssetVisual({
  prompt,
  width: 1920,
  height: 1080,
  seed: deterministicSeed
});
```

## API

See `asset-library.js` for implementation:

- `initialize()` - Load asset registry
- `findAsset(query)` - Search with metadata + semantic fallback
- `generateAsset(description)` - Create new asset
- `validateAsset(asset)` - Check style consistency
- `composeCharacter(identity, pose, emotion)` - Layer composition

## Schema Versioning

All assets track `schema_version: "1.0.0"` for evolution:

- **1.0.0:** Initial composable system
- **1.1.0:** (Future) Add animation keyframes
- **2.0.0:** (Future) 3D pose variants

## Performance

- **Metadata lookup:** <10ms (PostgreSQL indexed)
- **Semantic search:** <200ms (cached embeddings)
- **Asset composition:** <500ms (image layering)
- **Asset generation:** <100ms (code-driven / local procedural)

## Storage

- **Per identity:** ~2MB (base + poses + emotions)
- **Total library:** ~100MB for 47 composable assets
- **Cache efficiency:** 70%+ asset reuse across videos
