# Universal Base source models

Unchanged FBX sources provided by the user in `Unity.7z` (female/male full bodies) and `FBX (Unity).7z` (hair and eyebrows). No textures, animation clips, or license document accompanied these archives; no authorship or license is inferred here.

Current runtime NPCs are built from these full-body meshes, including their heads, eyes, skin weights, and complete 65-joint hierarchy. Older procedural NPC geometry and the separately supplied head are not used by this builder. The shape, materials, clothing, bind positions, and runtime poses are adapted toward the user's seated-character reference. This is an approximation, not an exact reconstruction of that image.

Rebuild from the repository root using Blender 4.3+:

```sh
blender -b --factory-startup --python-exit-code 1 --python scripts/build-universal-detainees.py
```

Outputs: `src/assets/detainee-{woman,man}.glb` and editable `public/models/detainee-{woman,man}.blend`. Runtime sitting, breathing, head turns, and blinking are in `src/detainee.js`.

The builder imports mesh construction/material utilities from `scripts/build-detainees.py`, but does not import its old characters. Legacy generators will overwrite the current characters if run; use the Universal builder for current assets.
