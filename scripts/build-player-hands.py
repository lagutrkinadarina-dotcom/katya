"""Pose the MIT-licensed WebXR hand; Blender 4.3+, no network needed.
Run: blender --background --factory-startup --python scripts/build-player-hands.py
Source: @webxr-input-profiles/assets 1.0.18, generic-hand/right.glb.
Copyright (c) 2019 Amazon. See public/licenses/webxr-input-profiles-assets-MIT.txt.
"""
import bpy
import bmesh
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
            a=j/sides*math.tau
            r=radii[i];rn,rb=r if isinstance(r,tuple) else (r,r)
            verts.append(xyz(p+n*math.cos(a)*rn+b*math.sin(a)*rb))
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


def rebuild_fingertip(skin,rest,finger,cut_back=.003,cap_depth=.005):
    """Delete the projecting distal faces and close the finger with a rounded cap.

    Work in the source rest mesh, so bone transforms and grasp poses stay intact.
    Only the local cut seam is welded; the cap inherits its boundary skin weights.
    """
    group=skin.vertex_groups[finger+'-phalanx-distal'].index
    affected={group}
    if finger=='index-finger':affected.add(skin.vertex_groups[finger+'-phalanx-intermediate'].index)
    start=rest[finger+'-phalanx-distal'];end=rest[finger+'-tip']
    axis=(end-start).normalized();cut=(end-start).length-cut_back
    bm=bmesh.new();bm.from_mesh(skin.data);weights=bm.verts.layers.deform.active
    def belongs(v):return sum(v[weights].get(joint,0) for joint in affected)>.5
    def local(v):return belongs(v) and (v.co-start).dot(axis)>cut-.004
    bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if local(v)],dist=.000001)
    faces=[f for f in bm.faces if any(local(v) for v in f.verts)]
    edges={e for f in faces for e in f.edges};verts={v for f in faces for v in f.verts}
    bmesh.ops.bisect_plane(bm,geom=[*faces,*edges,*verts],dist=.0000001,
        plane_co=start+axis*cut,plane_no=axis,clear_outer=True,clear_inner=False)
    cut_vertices=[v for v in bm.verts if belongs(v) and abs((v.co-start).dot(axis)-cut)<.000001]
    bmesh.ops.remove_doubles(bm,verts=cut_vertices,dist=.000001)
    boundary=[e for e in bm.edges if e.is_boundary and all(belongs(v) and abs((v.co-start).dot(axis)-cut)<.000001 for v in e.verts)]
    assert boundary, 'Missing fingertip cut boundary: '+finger
    adjacent={}
    for edge in boundary:
        a,b=edge.verts;adjacent.setdefault(a,[]).append(b);adjacent.setdefault(b,[]).append(a)
    assert all(len(ns)==2 for ns in adjacent.values()), 'Open fingertip cut seam: '+finger
    first=next(iter(adjacent));ring=[first];previous=None;current=first
    while True:
        nxt=next(v for v in adjacent[current] if v!=previous)
        if nxt==first:break
        ring.append(nxt);previous,current=current,nxt
    assert len(ring)==len(adjacent), 'Unexpected fingertip boundary components: '+finger
    center=sum((v.co for v in ring),Vector())/len(ring);radials=[v.co-center for v in ring]
    # Skin rings close to a short rounded tip, with no nail mesh.
    average_weights={}
    for vertex in ring:
        for joint,weight in vertex[weights].items():average_weights[joint]=average_weights.get(joint,0)+weight/len(ring)
    previous_ring=ring
    for angle in [math.pi/6,math.pi/3]:
        new_ring=[]
        for boundary_vertex,radial in zip(ring,radials):
            v=bm.verts.new(center+radial*math.cos(angle)+axis*cap_depth*math.sin(angle))
            for joint,weight in boundary_vertex[weights].items():v[weights][joint]=weight
            new_ring.append(v)
        for j in range(len(ring)):
            k=(j+1)%len(ring)
            bm.faces.new((previous_ring[j],previous_ring[k],new_ring[k],new_ring[j]))
        previous_ring=new_ring
    tip=bm.verts.new(center+axis*cap_depth)
    for joint,weight in average_weights.items():tip[weights][joint]=weight
    for j in range(len(ring)):bm.faces.new((previous_ring[j],previous_ring[(j+1)%len(ring)],tip))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(skin.data);bm.free();skin.data.update()


def pose(kind):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    skin=next(o for o in bpy.context.scene.objects if o.type=='MESH');skin.name='webxr-'+kind+'-skin'
    rest={b.name:b.head_local.copy() for b in arm.data.bones}
    wrist_end=None
    if kind=='payment':
        # The source wrist cap is a separate twenty-vertex surface. Mark both
        # the cap and its matching seam vertices so their end plane stays joined.
        bm=bmesh.new();bm.from_mesh(skin.data);unseen=set(bm.verts);cap=[]
        while unseen:
            stack=[next(iter(unseen))];component=set()
            while stack:
                vertex=stack.pop()
                if vertex in component:continue
                component.add(vertex);stack.extend(edge.other_vert(vertex) for edge in vertex.link_edges)
            unseen.difference_update(component)
            if len(component)==20:cap=[v.co.copy() for v in component]
        bm.free();assert cap, 'Source wrist end cap missing'
        wrist_end=skin.vertex_groups.new(name='wrist-end-plane').index
        for vertex in skin.data.vertices:
            if any((vertex.co-point).length<.000001 for point in cap):skin.vertex_groups[wrist_end].add([vertex.index],1.,'REPLACE')
    rebuild_fingertip(skin,rest,'thumb')
    if kind=='payment':rebuild_fingertip(skin,rest,'index-finger')
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
            if finger=='index':target[ns[1]].y-=.012
            ds=[(.10,.98,-.15),(-.70,.55,-.45),(-.75,.50,-.42)] if finger=='index' else [(0,.79,-.61),(0,.20,-.98),(0,-.60,-.80)]
            if finger=='middle':ds[2]=(0,.20,-.98)
            elif finger=='ring':ds[2]=(0,-.30,-.95)
            for previous,current,d in zip(ns[1:],ns[2:],ds):
                target[current]=target[previous]+Vector(d).normalized()*(rest[current]-rest[previous]).length
        ns=names('thumb');target[ns[0]]=Vector((.048,.022,-.035))
        for previous,current,d in zip(ns,ns[1:],[(-.26,.96,-.08),(-.16,.97,.17),(-.10,.99,.02)]):
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
    if kind=='payment':
        for vertex in skin.data.vertices:
            if any(g.group==wrist_end and g.weight>.99 for g in vertex.groups):
                point=A.inverted()@vertex.co;point.y=-.040;vertex.co=xyz(point)

    # Smooth the approved mesh, rather than replacing its anatomy with primitive shapes.
    sub=skin.modifiers.new('Surface smoothing','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    if kind=='cup':
        # Shape contact pads against the outside of the cup, including while tilted.
        for v in skin.data.vertices:
            p=A.inverted()@v.co
            if 0<=p.y<=.133:
                radius=.037+.013*min(p.y,.13)/.13+.002
                distance=math.hypot(p.x,p.z)
                if 0<distance<radius:
                    p.x*=radius/distance;p.z*=radius/distance;v.co=xyz(p)
    skin.data.materials.clear();skin.data.materials.append(material('skin','bfa58f',.72))
    for f in skin.data.polygons:f.use_smooth=True
    shirt=material('shirt-cuff','d2cfbf',.85);cloth=material('uniform-sleeve','34414a',.94)
    if kind=='payment':
        tube('shirt-cuff',[(.075,-.029,.015),(.075,-.057,.015)],[(.0215,.0285),(.0215,.0285)],shirt)
        tube('short-payment-cuff',[(.075,-.051,.015),(.075,-.078,.015),(.075,-.110,.015)],[(.0225,.0295),(.0235,.0305),(.0255,.0325)],cloth)
    else:
        tube('shirt-cuff',[(.065,.068,.113),(.065,.068,.147)],[(.029,.020),(.029,.020)],shirt)
        tube('held-drink-sleeve',[(.065,.068,.142),(.065,.068,.160),(.082,.037,.198),(.104,-.036,.24),(.145,-.13,.28),(.18,-.24,.33)],[(.0305,.022),(.031,.023),.030,.033,.038,.043],cloth)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            bpy.context.view_layer.objects.active=obj;obj.select_set(True)
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
    bpy.ops.export_scene.gltf(filepath=str(OUT/('hand-'+kind+'.glb')),export_format='GLB',export_yup=True,export_apply=True)
    print('EXPORTED',kind,'reference anatomy with preserved bone lengths')

pose('cup')
pose('payment')
