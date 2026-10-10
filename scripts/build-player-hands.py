"""Pose the MIT-licensed WebXR hand; Blender 4.3+, no network needed.
Run: blender --background --factory-startup --python scripts/build-player-hands.py
Source: @webxr-input-profiles/assets 1.0.18, generic-hand/right.glb.
Copyright (c) 2019 Amazon. See public/licenses/webxr-input-profiles-assets-MIT.txt.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'scripts/assets/webxr-right.glb'
OUT=ROOT/'src/assets'
# Source Blender axes are converted to the game's Y-up axes when exported.
A=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
P=Matrix(((0,-1,0),(0,0,-1),(1,0,0)))


def xyz(p):
    return A@Vector(p)


def material(name,color,roughness):
    m=bpy.data.materials.new(name);m.use_nodes=True
    s=m.node_tree.nodes.get('Principled BSDF')
    def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    s.inputs['Base Color'].default_value=(*[linear(int(color[i:i+2],16)/255) for i in (0,2,4)],1)
    s.inputs['Roughness'].default_value=roughness
    return m


def tube(name,points,radii,mat):
    verts=[];faces=[];sides=32
    for i,p in enumerate(points):
        p=Vector(p);axis=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        n=axis.cross(Vector((1,0,0))).normalized();b=axis.cross(n).normalized()
        for j in range(sides):
            a=j/sides*math.tau;verts.append(xyz(p+(n*math.cos(a)+b*math.sin(a))*radii[i]))
    for i in range(len(points)-1):
        for j in range(sides):
            k=i*sides+j;q=i*sides+(j+1)%sides;faces.append((k,q,q+sides,k+sides))
    faces.append(tuple(range((len(points)-1)*sides,len(points)*sides)))
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(mat);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    for f in data.polygons:f.use_smooth=True
    return obj


def names(finger):
    base=finger+'-finger-' if finger!='thumb' else 'thumb-'
    return [base+'metacarpal',base+'phalanx-proximal',*([base+'phalanx-intermediate'] if finger!='thumb' else []),base+'phalanx-distal',base+'tip']


def pose(kind):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    skin=next(o for o in bpy.context.scene.objects if o.type=='MESH');skin.name='webxr-'+kind+'-skin'
    rest={b.name:b.head_local.copy() for b in arm.data.bones}
    base=Matrix.Identity(3) if kind=='cup' else P
    offset=Vector((.026,.078,.05)) if kind=='cup' else Vector((.075,-.020,.015))-base@rest['wrist']
    target={name:base@p+offset for name,p in rest.items()}
    # Four fingers follow the cup circumference. Every phalanx keeps its source length.
    if kind=='cup':
        for finger,pad in [('index',.008),('middle',.009),('ring',.008),('pinky',.006)]:
            ns=names(finger);p=target[ns[1]];radius=.037+.013*p.y/.13+pad
            for previous,current in zip(ns[1:],ns[2:]):
                p=target[previous];r=math.hypot(p.x,p.z);length=(rest[current]-rest[previous]).length
                angle=math.atan2(p.z,p.x)-math.acos(max(-1,min(1,(r*r+radius*radius-length*length)/(2*r*radius))))
                target[current]=Vector((radius*math.cos(angle),p.y,radius*math.sin(angle)))
        ns=names('thumb')
        directions=[Vector((-.68,.24,-.69)),Vector((-.97,-.04,.24)),Vector((-.79,-.10,-.60))]
        for previous,current,direction in zip(ns,ns[1:],directions):
            target[current]=target[previous]+direction.normalized()*(rest[current]-rest[previous]).length
    else:
        # Index and thumb meet on opposite sides of the note; the remaining fingers curl.
        for finger in ['index','middle','ring','pinky']:
            ns=names(finger)
            ds=[(-.38,.55,-.74),(-.85,-.25,.46),(-.72,-.05,.69)] if finger=='index' else [(0,.60,-.80),(0,-.60,-.80),(0,-1,.10)]
            for previous,current,d in zip(ns[1:],ns[2:],ds):
                target[current]=target[previous]+Vector(d).normalized()*(rest[current]-rest[previous]).length
        ns=names('thumb');target[ns[0]]=Vector((.048,.022,.005))
        for previous,current,d in zip(ns,ns[1:],[(-.60,.78,-.15),(-.47,.85,-.22),(-.65,.68,-.32)]):
            target[current]=target[previous]+Vector(d).normalized()*(rest[current]-rest[previous]).length
    following={a:b for finger in ['thumb','index','middle','ring','pinky'] for a,b in zip(names(finger),names(finger)[1:])}
    for b in arm.pose.bones:
        rotation=base
        if b.name in following:
            nxt=following[b.name];original=base@(rest[nxt]-rest[b.name]);desired=target[nxt]-target[b.name]
            rotation=original.rotation_difference(desired).to_matrix()@base
        elif b.name.endswith('tip'):
            previous=next(name for name,nxt in following.items() if nxt==b.name)
            original=base@(rest[b.name]-rest[previous]);desired=target[b.name]-target[previous]
            rotation=original.rotation_difference(desired).to_matrix()@base
        b.matrix=Matrix.Translation(xyz(target[b.name]))@(A@rotation@b.bone.matrix_local.to_3x3()).to_4x4()
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active=skin
    for modifier in list(skin.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    skin.parent=None;bpy.data.objects.remove(arm,do_unlink=True)
    # Smooth the approved mesh, rather than replacing its anatomy with primitive shapes.
    sub=skin.modifiers.new('Surface smoothing','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    skin.data.materials.clear();skin.data.materials.append(material('skin','bfa58f',.72))
    for f in skin.data.polygons:f.use_smooth=True
    shirt=material('shirt-cuff','d2cfbf',.85);cloth=material('uniform-sleeve','34414a',.94)
    if kind=='payment':
        tube('shirt-cuff',[(.075,-.038,.015),(.075,-.055,.016)],[.021,.022],shirt)
        tube('short-payment-cuff',[(.075,-.049,.016),(.077,-.078,.018),(.079,-.110,.020)],[.023,.026,.029],cloth)
    else:
        tube('shirt-cuff',[(.065,.069,.120),(.065,.066,.141)],[.022,.024],shirt)
        tube('held-drink-sleeve',[(.065,.067,.135),(.082,.037,.185),(.104,-.036,.24),(.145,-.13,.28),(.18,-.24,.33)],[.024,.028,.033,.038,.043],cloth)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
    bpy.ops.export_scene.gltf(filepath=str(OUT/('hand-'+kind+'.glb')),export_format='GLB',export_yup=True,export_apply=True)
    print('EXPORTED',kind,'reference anatomy with preserved bone lengths')

pose('cup')
pose('payment')
