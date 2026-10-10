"""Prepare the approved reference model for seated skeletal animation.

Run with Blender 4.3: blender -b --factory-startup --python-exit-code 1 --python scripts/prepare-duty-officer.py
Keeps the standing reference files intact; exports the game's rig with finger joints
and continuous, weighted sleeves instead of disconnected elbow caps.
"""
import bpy
import bmesh
import math
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def prepare_rig():
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
    # Open the actual jacket side panels. Their perimeter is reused by the sleeves
    # and welded after joining, so the shoulders share geometry and spine weights.
    body=bpy.data.objects['tailored-jacket']
    bm=bmesh.new();bm.from_mesh(body.data)
    shoulder_roots={}
    for side,label in [(-1,'L'),(1,'R')]:
        faces=[f for f in bm.faces if all(side*v.co.x>.24 and 1.279<v.co.z<1.481 and abs(v.co.y)<.077 for v in f.verts)]
        assert len(faces)==2, 'Jacket shoulder panel not found'
        boundary={e for f in faces for e in f.edges if sum(other in faces for other in e.link_faces)==1}
        bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
        bmesh.ops.subdivide_edges(bm,edges=list(boundary),cuts=1,use_grid_fill=False)
        edges=[e for e in bm.edges if len(e.link_faces)==1 and all(side*v.co.x>.24 and 1.279<v.co.z<1.481 and abs(v.co.y)<.077 for v in e.verts)]
        vertices={v for e in edges for v in e.verts}
        assert len(edges)==len(vertices)==8, 'Shoulder opening must be a closed eight-edge loop'
        shoulder_roots[label]=[tuple(v.co) for v in sorted(vertices,key=lambda v:math.atan2(v.co.y,side*(v.co.z-1.38)))]
    for edge in list(bm.edges):
        if not edge.link_faces:bm.edges.remove(edge)
    bm.to_mesh(body.data);bm.free();body.data.update()
    for side,label in [(-1,'L'),(1,'R')]:
        for name in ['upper-sleeve-','lower-sleeve-','angular-shoulder-']:
            bpy.data.objects.remove(bpy.data.objects[name+label],do_unlink=True)
        # Shared elbow rings have the same positions and blended joint weights.
        # Two transition rings blend the fixed jacket perimeter into the upper arm.
        # Fields: height, centre, radii, forearm blend, arm-versus-spine blend.
        rings=[(1.39,side*.257,.001,.076,.083,0,.45),
               (1.33,side*.271,.002,.074,.079,0,.9),
               (1.29,side*.278,.003,.072,.075,.04,1),
               (1.23,side*.294,.004,.069,.069,.25,1),
               (1.20,side*.298,.004,.067,.067,.5,1),
               (1.17,side*.300,.003,.065,.065,.75,1),
               (1.11,side*.302,0,.062,.062,.96,1),
               (.96,side*.306,-.005,.056,.055,1,1)]
        verts=shoulder_roots[label]+[(cx+x*rx,cy+y*ry,z) for z,cx,cy,rx,ry,_,_ in rings for x,y in outline]
        faces=[]
        for r in range(len(rings)):
            for i in range(8):
                a=r*8+i;b=r*8+(i+1)%8;c=b+8;d=a+8
                faces.extend([(a,b,c),(a,c,d)])
        faces.append(tuple(range(len(rings)*8,(len(rings)+1)*8)))
        data=bpy.data.meshes.new('continuous-sleeve-'+label);data.from_pydata(verts,[],faces);data.update()
        obj=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(obj)
        for m in materials:data.materials.append(m)
        for p in data.polygons:p.material_index=[0,0,1,0,2,0,1,0][p.index%8]
        upper=obj.vertex_groups.new(name='upper_arm.'+label)
        lower=obj.vertex_groups.new(name='forearm.'+label)
        spine=obj.vertex_groups.new(name='spine')
        spine.add(list(range(8)),1,'REPLACE')
        for r,ring in enumerate(rings):
            ids=list(range((r+1)*8,(r+2)*8));forearm,arm=ring[-2:]
            if arm<1:spine.add(ids,1-arm,'REPLACE')
            if forearm<1:upper.add(ids,(1-forearm)*arm,'REPLACE')
            if forearm>0:lower.add(ids,forearm*arm,'REPLACE')
        obj.parent=rig
        modifier=obj.modifiers.new('Officer skeleton','ARMATURE');modifier.object=rig
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)

    return rig,shoulder_roots


def join_rig(rig,shoulder_roots):
    # One skinned surface with material groups avoids a separate draw call for each
    # tiny clothing panel. Joining keeps the named bone weights and flat face normals.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in rig.children:
        if obj.type=='MESH':obj.select_set(True)
    bpy.context.view_layer.objects.active=bpy.data.objects['continuous-sleeve-L']
    bpy.ops.object.join()
    bpy.context.object.name='officer-skin'
    skin=bpy.context.object
    bm=bmesh.new();bm.from_mesh(skin.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    for root in shoulder_roots.values():
        seam=[v for v in bm.verts if any((v.co-Vector(p)).length<.000001 for p in root)]
        assert len(seam)==8, 'Shoulder perimeter must be welded'
        seam_edges={e for v in seam for e in v.link_edges if all(other in seam for other in e.verts)}
        assert len(seam_edges)==8 and all(len(e.link_faces)==2 for e in seam_edges), 'Open shoulder seam'
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(skin.data);bm.free();skin.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for obj in rig.children:
        if obj.type=='MESH':obj.select_set(True)
    return skin


if __name__=='__main__':
    rig,roots=prepare_rig()
    join_rig(rig,roots)
    out=ROOT/'src/assets/officer-duty.glb'
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
    print('EXPORTED seated-animation rig: 26 bones, weighted continuous elbows, independent fingers')
