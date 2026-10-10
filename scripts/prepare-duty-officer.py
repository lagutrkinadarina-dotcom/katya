"""Prepare the approved reference model for seated skeletal animation.

Run with Blender 4.3: blender -b --factory-startup --python-exit-code 1 --python scripts/prepare-duty-officer.py
Keeps the standing reference files intact; exports the game's rig with finger joints
and continuous, weighted sleeves instead of disconnected elbow caps.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/officer-reference.blend'))
rig = bpy.data.objects['reference-officer-rig']
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for side,label in [(-1,'L'),(1,'R')]:
    for i in range(4):
        x=side*.306+(i-1.5)*.018
        bone=rig.data.edit_bones.new(f'finger{i}.{label}')
        bone.head=(x,-.006,.859)
        bone.tail=(x,-.009,.813+abs(i-1.5)*.005)
        bone.parent=rig.data.edit_bones['hand.'+label]
    bone=rig.data.edit_bones.new('thumb.'+label)
    bone.head=(side*.272,-.017,.912);bone.tail=(side*.254,-.023,.865)
    bone.parent=rig.data.edit_bones['hand.'+label]
bpy.ops.object.mode_set(mode='OBJECT')
for label in ['L','R']:
    for i in range(4):
        obj=bpy.data.objects[f'finger-{label}-{i}']
        obj.vertex_groups.clear()
        obj.vertex_groups.new(name=f'finger{i}.{label}').add(list(range(len(obj.data.vertices))),1,'REPLACE')
    obj=bpy.data.objects['thumb-'+label];obj.vertex_groups.clear()
    obj.vertex_groups.new(name='thumb.'+label).add(list(range(len(obj.data.vertices))),1,'REPLACE')

outline=[(-.72,-1),(.72,-1),(1,-.64),(1,.64),(.72,1),(-.72,1),(-1,.64),(-1,-.64)]
materials=[bpy.data.materials[name] for name in ['uniform-blue','uniform-light-panel','uniform-dark-panel']]
for side,label in [(-1,'L'),(1,'R')]:
    for name in ['upper-sleeve-','lower-sleeve-']:
        bpy.data.objects.remove(bpy.data.objects[name+label],do_unlink=True)
    # Shared elbow rings have the same positions and blended joint weights.
    rings=[(1.46,side*.239,0,.078,.086,0),
           (1.29,side*.278,.003,.072,.075,.04),
           (1.23,side*.294,.004,.069,.069,.25),
           (1.20,side*.298,.004,.067,.067,.5),
           (1.17,side*.300,.003,.065,.065,.75),
           (1.11,side*.302,0,.062,.062,.96),
           (.96,side*.306,-.005,.056,.055,1)]
    verts=[(cx+x*rx,cy+y*ry,z) for z,cx,cy,rx,ry,_ in rings for x,y in outline]
    faces=[tuple(reversed(range(8)))]
    for r in range(len(rings)-1):
        for i in range(8):
            a=r*8+i;b=r*8+(i+1)%8;c=b+8;d=a+8
            faces.extend([(a,b,c),(a,c,d)])
    faces.append(tuple(range((len(rings)-1)*8,len(rings)*8)))
    data=bpy.data.meshes.new('continuous-sleeve-'+label);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(obj)
    for m in materials:data.materials.append(m)
    for p in data.polygons:p.material_index=[0,0,1,0,2,0,1,0][p.index%8]
    upper=obj.vertex_groups.new(name='upper_arm.'+label)
    lower=obj.vertex_groups.new(name='forearm.'+label)
    for r,ring in enumerate(rings):
        ids=list(range(r*8,(r+1)*8));weight=ring[-1]
        if weight<1:upper.add(ids,1-weight,'REPLACE')
        if weight>0:lower.add(ids,weight,'REPLACE')
    obj.parent=rig
    modifier=obj.modifiers.new('Officer skeleton','ARMATURE');modifier.object=rig
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)

# One skinned surface with material groups avoids a separate draw call for each
# tiny clothing panel. Joining keeps the named bone weights and flat face normals.
bpy.ops.object.select_all(action='DESELECT')
for obj in rig.children:
    if obj.type=='MESH':obj.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['continuous-sleeve-L']
bpy.ops.object.join()
bpy.context.object.name='officer-skin'
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for obj in rig.children:
    if obj.type=='MESH':obj.select_set(True)
out=ROOT/'src/assets/officer-duty.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
print('EXPORTED seated-animation rig: 26 bones, weighted continuous elbows, independent fingers')
