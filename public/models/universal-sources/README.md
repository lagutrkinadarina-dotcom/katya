# Universal Base source models

Unchanged FBX sources provided by the user in `Unity.7z` (female/male full bodies) and `FBX (Unity).7z` (hair and eyebrows). No textures, animation clips, or license document accompanied these archives; no authorship or license is inferred here.

Current runtime NPCs are built from these full-body meshes, including their heads, eyes, skin bindings, and complete 65-joint hierarchy. Older procedural NPC bodies and the separately supplied head are not used by this builder. Body proportions and facial geometry are sculpted; new fitted clothing and hair are bound to the same skeleton. Runtime poses are adapted toward the user's seated-character reference. This is an approximation, especially in facial likeness, not an exact reconstruction of that image.

Rebuild from the repository root using Blender 4.3+:

```sh
blender -b --factory-startup --python-exit-code 1 --python scripts/build-universal-detainees.py
blender -b --factory-startup --python-exit-code 1 --python scripts/check-detainee-models.py
npm test
npm run build
python scripts/package-game.py
```

Outputs: `src/assets/detainee-{woman,man}.glb` and editable `public/models/detainee-{woman,man}.blend`. Runtime sitting, breathing, head turns, and blinking are in `src/detainee.js`.

The builder imports mesh construction/material utilities from `scripts/build-detainees.py`, but does not import its old characters. Legacy generators will overwrite the current characters if run; use the Universal builder for current assets.

The builder requires `detainee-female-clothing.py`, `detainee-male-clothing.py`, and `detainee-faces-hair.py` beside it. Clothing is exported as separate weighted geometry: smooth fitted female sleeves and blouse, source-derived male shirt/trousers, collars, cuffs, buttons, an underdress bodice and a seated cloth skirt. The skirt is authored in the canonical sitting pose and inverse-bound to the pelvis and thighs. The female hair blends head and upper-spine weights below the shoulders; the male haircut is one short fitted solid scalp surface, without detached locks. His relaxed closed lips use the original face topology, with no protruding tongue or mouth accessory. Eye depth, eyelids, blinking, and finger-phalange posing are adapted without camera or lighting changes in the game.

The original body is marked as the support surface. Its saved pelvis contact height and foot geometry determine the seat/floor anchors; garment hems do not affect sitting height. `check-detainee-models.py` checks both editable outputs for 65 joints, finite vertices, normalized weights, and valid armature bindings.
