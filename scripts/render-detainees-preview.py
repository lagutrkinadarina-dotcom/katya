"""Render the actual game GLBs from four angles, including a face contact sheet.

Run from the repository root after building the models:
    blender -b --factory-startup --python-exit-code 1 --python scripts/render-detainees-preview.py

Optional settings follow Blender's separator, for example:
    ... -- --samples 32 --width 640 --body-only

The previews use the imported meshes, materials, skin and rest pose unchanged.
Pillow only arranges the separate camera renders into rows; it does not retouch
the models. Woman is the top row, man the bottom row. Columns are front,
three-quarter, profile and back. Individual renders stay in a temporary folder.
"""

import argparse
import math
from pathlib import Path
import sys
import tempfile

import bpy
from mathutils import Vector
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / 'docs/previews'
ANGLES = [('front', 0), ('three-quarter', 45), ('profile', 90), ('back', 180)]


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples', type=int, default=20)
    parser.add_argument('--width', type=int, default=560)
    parser.add_argument('--body-only', action='store_true')
    values = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    return parser.parse_args(values)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def studio(samples):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False  # Also works in Blender builds without OIDN.
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.view_settings.exposure = 0
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes['Background']
    background.inputs['Color'].default_value = (.31, .37, .35, 1)
    background.inputs['Strength'].default_value = .7

    floor_material = bpy.data.materials.new('Preview ground')
    floor_material.use_nodes = True
    shader = floor_material.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (.22, .27, .25, 1)
    shader.inputs['Roughness'].default_value = 1
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor = bpy.context.object
    floor.name = 'Preview ground'
    floor.data.materials.append(floor_material)

    for name, location, energy, size in [
        ('Key', (-3, -4, 5), 450, 4),
        ('Fill', (3, -2, 2.5), 140, 3),
        ('Rim', (1, 3, 4), 230, 3),
    ]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        point_at(light, (0, 0, 1))
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.lens = 65
    scene.camera = camera
    return scene, camera


def import_character(kind):
    path = ROOT / f'src/assets/detainee-{kind}.glb'
    if not path.is_file():
        raise FileNotFoundError(f'Build the game model first: {path}')
    previous = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = set(bpy.context.scene.objects) - previous
    roots = [obj for obj in objects if obj.parent is None]
    if not roots or not any(obj.type == 'MESH' for obj in objects):
        raise RuntimeError(f'Imported model has no character meshes: {path}')
    # The export contains an idle clip. The turnaround deliberately shows the
    # undistorted rest mesh so shoulder, wrist, hair and knee seams are visible.
    for obj in objects:
        if obj.animation_data:
            obj.animation_data_clear()
        if obj.type == 'ARMATURE':
            obj.data.pose_position = 'REST'
    return objects, roots


def camera_view(camera, angle, closeup):
    radians = math.radians(angle)
    distance = 5
    center_z = 1.73 if closeup else .99
    camera.location = (distance * math.sin(radians), -distance * math.cos(radians), center_z + .05)
    point_at(camera, (0, 0, center_z))
    camera.data.ortho_scale = .53 if closeup else 2.15


def contact_sheet(paths, output, columns=4):
    images = [Image.open(path).convert('RGB') for path in paths]
    tile_width, tile_height = images[0].size
    gap = 10
    rows = math.ceil(len(images) / columns)
    sheet = Image.new('RGB', (tile_width * columns + gap * (columns + 1), tile_height * rows + gap * (rows + 1)), '#242c29')
    for index, tile in enumerate(images):
        sheet.paste(tile, (gap + (index % columns) * (tile_width + gap), gap + (index // columns) * (tile_height + gap)))
        tile.close()
    sheet.save(output, optimize=True)
    print(f'PREVIEW {output}', flush=True)


def main():
    args = arguments()
    scene, camera = studio(args.samples)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix='katya-detainees-turnaround-'))
    body_paths = []
    head_paths = []
    for kind in ['woman', 'man']:
        objects, _ = import_character(kind)
        for name, angle in ANGLES:
            for closeup in ([False] if args.body_only else [False, True]):
                camera_view(camera, angle, closeup)
                scene.render.resolution_x = args.width
                scene.render.resolution_y = args.width if closeup else round(args.width * 1.55)
                path = temporary / f'{kind}-{name}-{"head" if closeup else "body"}.png'
                scene.render.filepath = str(path)
                bpy.ops.render.render(write_still=True)
                (head_paths if closeup else body_paths).append(path)
                print(f'ANGLE {kind} {name} {"head" if closeup else "body"}', flush=True)
        for obj in objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    contact_sheet(body_paths, PREVIEWS / 'detainees-turnaround.png')
    contact_sheet([body_paths[0], body_paths[4]], PREVIEWS / 'detainees-reference.png', columns=2)
    if head_paths:
        contact_sheet(head_paths, PREVIEWS / 'detainees-heads-turnaround.png')
    print(f'Individual camera renders: {temporary}', flush=True)


if __name__ == '__main__':
    main()
