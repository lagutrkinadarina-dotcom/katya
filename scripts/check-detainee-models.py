"""Validate editable NPC source models. Run with Blender in background mode."""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]


def source_aliases():
    names = {'pelvis': 'hips', 'spine_01': 'spine', 'neck_01': 'neck', 'Head': 'head'}
    for suffix, side in [('l', 'L'), ('r', 'R')]:
        for old, new in [('upperarm', 'upper_arm'), ('lowerarm', 'forearm'),
                         ('hand', 'hand'), ('thigh', 'thigh'), ('calf', 'shin'),
                         ('foot', 'foot')]:
            names[old + '_' + suffix] = new + '.' + side
        for index, old in enumerate(['index', 'middle', 'ring', 'pinky']):
            names[old + '_01_' + suffix] = f'finger{index}.{side}'
        names['thumb_01_' + suffix] = 'thumb.' + side
    return names


aliases = source_aliases()
for kind, sex in [('woman', 'Female'), ('man', 'Male')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(
        ROOT / f'public/models/universal-sources/Superhero_{sex}_FullBody.fbx'))
    source_rigs = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    assert len(source_rigs) == 1, f'{sex}: expected one supplied source skeleton'
    expected_parents = {
        aliases.get(bone.name, bone.name):
        aliases.get(bone.parent.name, bone.parent.name) if bone.parent else None
        for bone in source_rigs[0].data.bones
    }
    assert len(expected_parents) == len(source_rigs[0].data.bones) == 65
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / f'public/models/detainee-{kind}.blend'))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    assert len(rig.data.bones) == rig['originalBoneCount'] == 65
    actual_parents = {
        bone.name: bone.parent.name if bone.parent else None
        for bone in rig.data.bones
    }
    assert actual_parents.keys() == expected_parents.keys(), (
        kind, 'source joint names changed',
        sorted(expected_parents.keys() - actual_parents.keys()),
        sorted(actual_parents.keys() - expected_parents.keys()))
    assert actual_parents == expected_parents, (
        kind, 'source parent hierarchy changed',
        {name: (expected_parents[name], actual_parents[name])
         for name in expected_parents if expected_parents[name] != actual_parents[name]})
    assert rig['sourceBody'] == f'Superhero_{sex}_FullBody.fbx'
    assert math.isfinite(rig['restHipSupportHeight'])
    support = [obj for obj in rig.children if obj.get('supportSurface')]
    assert len(support) == 1 and 'continuous-body' in support[0].name
    count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        assert obj.parent == rig, obj.name
        assert all(group.name in rig.data.bones for group in obj.vertex_groups), obj.name
        assert any(mod.type == 'ARMATURE' and mod.object == rig for mod in obj.modifiers), obj.name
        for vertex in obj.data.vertices:
            assert all(math.isfinite(value) for value in vertex.co), obj.name
            assert abs(sum(group.weight for group in vertex.groups) - 1) < 1e-4, (obj.name, vertex.index)
            count += 1
    print(f'PASS {kind}: 65 source joint names and parent hierarchy preserved, '
          f'valid skin bindings, finite geometry, {count} vertices')
