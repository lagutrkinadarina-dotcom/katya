"""Tailor a rounded duty officer from the supplied Universal male anatomy.

The editable Universal male is the sculpted cache of the supplied
Superhero_Male_FullBody.fbx. Its original 65-joint hierarchy, continuous head,
hands and axilla are retained. This script never rewrites either detainee.
Run after build-universal-detainees.py:
blender -b --factory-startup --python-exit-code 1 --python scripts/build-rounded-officer.py
"""
import bpy
import bmesh
import math
import importlib.util
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('officer_surface_tools',ROOT/'scripts/build-detainees.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/detainee-man.blend'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
rig.name='rounded-duty-officer-rig'
main=bpy.data.objects['universal-man-continuous-body']
main.name='officer-original-continuous-anatomy'
shirt=h.material('officer-blue-woven-uniform','245879')
navy=h.material('officer-navy-trousers','202E42')
trim=h.material('officer-navy-uniform-trim','263D51')
black=h.material('officer-tie-and-duty-belt','20242A')
gold=h.material('officer-brushed-brass','C3A45F')
gold.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.58
gold.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.46
thread=h.material('officer-blue-stitch','517C8E')
skin=h.material('officer-warm-skin','C99B6C')
hair=h.material('officer-short-brown-hair','443125')

def apply(obj,modifier):
    bpy.context.view_layer.objects.active=obj
    while obj.modifiers.find(modifier.name)>0:bpy.ops.object.modifier_move_up(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=modifier.name)

def finish(obj,thickness=0):
    if obj.data.has_custom_normals:
        # FBX custom normals describe the original athletic T-pose surface.
        # They must not survive the geometry edits made to a relaxed garment.
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for p in obj.data.polygons:p.use_smooth=True
    if thickness:
        mod=obj.modifiers.new('Tailored fabric edge','SOLIDIFY');mod.thickness=thickness;mod.offset=0;apply(obj,mod)

def bind(obj,bone):
    obj.parent=rig;obj.vertex_groups.clear();g=obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Original Universal 65-joint rig','ARMATURE');mod.object=rig
    finish(obj)

# Replace only clothes/accessories. The existing rounded eye and closed-lip
# anatomy remain original continuous source surfaces with their source weights.
for obj in list(rig.children):
    if obj.type!='MESH':continue
    if obj==main:continue
    if 'eyes' in obj.name or 'brows' in obj.name or 'fitted-hair-cap' in obj.name or 'tailored-trousers' in obj.name:continue
    bpy.data.objects.remove(obj,do_unlink=True)
for i,mat in enumerate(list(main.data.materials)):
    main.data.materials[i]=skin if i==0 else shirt if i==1 else navy if i==2 else mat
for obj in rig.children:
    if obj.type!='MESH':continue
    if 'tailored-trousers' in obj.name:
        obj.name='officer-source-tailored-trousers';obj.data.materials.clear();obj.data.materials.append(navy)
    elif 'fitted-hair-cap' in obj.name:
        obj.name='officer-short-hair-under-cap';obj.data.materials.clear();obj.data.materials.append(hair)
    elif 'brows' in obj.name:
        obj.name='officer-calm-eyebrows';obj.data.materials.clear();obj.data.materials.append(hair)
        # Reduce the comic prisoner's asymmetric eyebrow raise.
        for v in obj.data.vertices:
            v.co.z-=.004 if v.co.x>0 else -.001
            v.co.z+=.007*math.exp(-((abs(v.co.x)-.037)/.035)**2)
    elif 'eyes' in obj.name:obj.name='officer-source-eyes'

# One torso-to-wrist shell copies source skin topology and all blended arm
# weights. There are no separate shoulder caps, elbow balls or hand sleeves.
cloth=main.copy();cloth.data=main.data.copy();cloth.name='officer-continuous-long-sleeve-uniform'
bpy.context.collection.objects.link(cloth)
bm=bmesh.new();bm.from_mesh(cloth.data);deform=bm.verts.layers.deform.active
def weights(v):return {cloth.vertex_groups[g].name:a for g,a in v[deform].items() if a>1e-7}
drop=[]
for f in bm.faces:
    c=f.calc_center_median()
    neck=sum(sum(a for n,a in weights(v).items() if n in ['neck','head']) for v in f.verts)/len(f.verts)
    arm=sum(sum(a for n,a in weights(v).items() if n.startswith(('upper_arm','upperarm_twist','forearm','lowerarm_twist'))) for v in f.verts)/len(f.verts)
    if c.z<1.055 or neck>.42 and arm<.2:drop.append(f)
bmesh.ops.delete(bm,geom=drop,context='FACES')
for sign,side in [(-1,'L'),(1,'R')]:
    cut=abs(rig.data.bones['hand.'+side].head_local.x)-.019
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,
        plane_co=(sign*cut,0,0),plane_no=(sign,0,0),clear_outer=True,clear_inner=False)
# Keep only the connected torso and both original axillae.
visited=set();parts=[]
for v in bm.verts:
    if v in visited or not v.link_faces:continue
    stack=[v];part=set()
    while stack:
        cur=stack.pop()
        if cur in visited:continue
        visited.add(cur);part.add(cur);stack.extend(e.other_vert(cur) for e in cur.link_edges)
    parts.append(part)
keep=max(parts,key=len);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
for _ in range(8):bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],factor=.40,use_axis_x=True,use_axis_y=True,use_axis_z=True)
for v in bm.verts:
    x=abs(v.co.x);side='L' if v.co.x<0 else 'R'
    upper=rig.data.bones['upper_arm.'+side];lower=rig.data.bones['forearm.'+side];wrist=rig.data.bones['hand.'+side]
    start=upper.head_local;elbow=lower.head_local;end=wrist.head_local
    t=max(0,min(1,(x-abs(start.x))/(abs(end.x)-abs(start.x))))
    if x<abs(elbow.x):
        f=max(0,min(1,(x-abs(start.x))/(abs(elbow.x)-abs(start.x))));centre=start.lerp(elbow,f)
    else:
        f=max(0,min(1,(x-abs(elbow.x))/(abs(end.x)-abs(elbow.x))));centre=elbow.lerp(end,f)
    blend=max(0,min(1,(x-.205)/.105));blend=blend*blend*(3-2*blend)
    angle=math.atan2(v.co.z-centre.z,v.co.y-centre.y)
    target=Vector((v.co.x,centre.y+(.090-.052*t)*math.cos(angle),centre.z+(.087-.050*t)*math.sin(angle)))
    v.co=v.co.lerp(target,blend)
    if x>.705:
        # The cuff belongs entirely to the lower sleeve. Hand blended weights
        # otherwise twist alternate clipped vertices into small black spikes.
        v[deform].clear();v[deform][cloth.vertex_groups['forearm.'+side].index]=1
bm.normal_update()
for v in bm.verts:v.co+=v.normal*.009
for v in bm.verts:
    if not v.is_boundary or abs(v.co.x)<.68:continue
    side='L' if v.co.x<0 else 'R';sign=-1 if v.co.x<0 else 1
    lower=rig.data.bones['forearm.'+side].head_local;wrist=rig.data.bones['hand.'+side].head_local
    cut=abs(wrist.x)-.019;t=(cut-abs(lower.x))/(abs(wrist.x)-abs(lower.x));centre=lower.lerp(wrist,t)
    angle=math.atan2(v.co.z-centre.z,v.co.y-centre.y)
    # A uniform closed fabric edge retains source connectivity while removing
    # ragged intersections from the triangulated source wrist cut. The cuff is
    # part of this same surface, so two near-coplanar shells cannot z-fight.
    v.co=Vector((sign*cut,centre.y+.047*math.cos(angle),centre.z+.047*math.sin(angle)))
for f in bm.faces:f.material_index=1 if abs(f.calc_center_median().x)>.706 else 0
# Tailor the actual bent shoulder/elbow surface, then inverse-bind it to the
# same source weights. Smoothing only the T-pose coordinates leaves the skin
# weights around the old athletic deltoid folding the shirt onto itself.
hip=rig.data.bones['hips'].head_local
seated=.56+hip.z+0-float(rig['restHipSupportHeight'])
shift=Vector((0,0,seated-hip.z))
skinmat={name:Matrix.Translation(shift) for name in rig.data.bones.keys()}
def two_bone(start,target,a,b,pole):
    axis=target-start;dist=max(abs(a-b)+1e-5,min(a+b-1e-5,axis.length));axis.normalize()
    bend=pole-axis*pole.dot(axis);bend.normalize()
    along=(a*a-b*b+dist*dist)/(2*dist);height=math.sqrt(max(0,a*a-along*along))
    return start+axis*along+bend*height,start+axis*dist
relx=.11*math.cos(.25)-.535*math.sin(.25)
relfront=.11*math.sin(.25)+.535*math.cos(.25)
driven=set()
for sign,side in [(-1,'L'),(1,'R')]:
    a=rig.data.bones['upper_arm.'+side].head_local
    b=rig.data.bones['forearm.'+side].head_local
    c=rig.data.bones['hand.'+side].head_local
    start=a+shift;target=Vector((relx+sign*.105,-(relfront-.147),1.1415))
    elbow,end=two_bone(start,target,(b-a).length,(c-b).length,Vector((sign*.2,0,-1)))
    for name,oldhead,oldend,newhead,newend in [
        ('upper_arm.'+side,a,b,start,elbow),('forearm.'+side,b,c,elbow,end)]:
        q=(oldend-oldhead).rotation_difference(newend-newhead)
        skinmat[name]=Matrix.Translation(newhead)@q.to_matrix().to_4x4()@Matrix.Translation(-oldhead);driven.add(name)
for bone in sorted(rig.data.bones,key=lambda b:len(b.parent_recursive)):
    if bone.name in driven:continue
    if bone.parent and bone.parent.name in driven:
        skinmat[bone.name]=skinmat[bone.parent.name];driven.add(bone.name)
def blended(w):
    matrix=Matrix(((0,0,0,0),(0,0,0,0),(0,0,0,0),(0,0,0,0)))
    for name,amount in w.items():matrix+=skinmat[name]*amount
    return matrix
restore={v:v.co.copy() for v in bm.verts}
bindings={v:blended(weights(v)) for v in bm.verts}
tailoring=[v for v in bm.verts if .15<abs(v.co.x)<.645 and not v.is_boundary]
for v in bm.verts:v.co=bindings[v]@v.co
for _ in range(18):bmesh.ops.smooth_vert(bm,verts=tailoring,factor=.48,use_axis_x=True,use_axis_y=True,use_axis_z=True)
for v in bm.verts:
    v.co=bindings[v].inverted_safe()@v.co if v in tailoring else restore[v]
bm.normal_update()
bm.to_mesh(cloth.data);bm.free();cloth.data.materials.clear();cloth.data.materials.append(shirt);cloth.data.materials.append(trim);finish(cloth)
cloth['continuousTorsoSleeves']=True
cloth['canonicalTypingShoulderFit']=True
# The supplied athletic forearm surface is completely enclosed by a fitted
# sleeve. Remove its covered polygons, retaining the whole wrist/hand surface;
# enlarging sleeves to cover hidden muscle bulges would create balloon arms.
covered=bmesh.new();covered.from_mesh(main.data);source_deform=covered.verts.layers.deform.active
drop=[]
for face in covered.faces:
    c=face.calc_center_median()
    arm=sum(sum(a for g,a in v[source_deform].items() if main.vertex_groups[g].name.startswith(('upper_arm','upperarm_twist','forearm','lowerarm_twist'))) for v in face.verts)/len(face.verts)
    neck=sum(sum(a for g,a in v[source_deform].items() if main.vertex_groups[g].name in ['neck','head']) for v in face.verts)/len(face.verts)
    # Cover the whole original deltoid/axilla transition, including vertices
    # blending into the torso. Leaving the inner shoulder in place creates a
    # dark diagonal intersection under a relaxed source-derived shirt shell.
    sleeve_covered=arm>.08 and abs(c.x)<.730 and neck<.40
    torso_covered=1.073<c.z<1.590 and abs(c.x)<.29 and neck<.30
    if sleeve_covered or torso_covered:drop.append(face)
bmesh.ops.delete(covered,geom=drop,context='FACES');covered.normal_update();covered.to_mesh(main.data);covered.free()

tree=BVHTree.FromPolygons([v.co for v in cloth.data.vertices],[list(p.vertices) for p in cloth.data.polygons])
def sample(x,z):
    hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    if hit[0] is None:return Vector((x,-.11,z)),{'spine_03':1}
    poly=cloth.data.polygons[hit[2]];w={}
    for i in poly.vertices:
        for g in cloth.data.vertices[i].groups:
            name=cloth.vertex_groups[g.group].name;w[name]=w.get(name,0)+g.weight/len(poly.vertices)
    total=sum(w.values());return hit[0]+hit[1]*.003,{n:a/total for n,a in w.items()}

def surface_patch(name,outline,mat,offset=.002):
    s=h.Surface(name,rig,[mat]);ids=[]
    for x,z in outline:
        co,w=sample(x,z);co.y-=offset;ids.append(s.vertex(co,w))
    s.face(ids);obj=s.object();finish(obj,.0015);return obj

# Every decoration follows the shirt's actual curved surface, including skin
# weights; no hard-coded floating panels at the neckline or belly.
placket=h.Surface('officer-sewn-centre-placket',rig,[shirt]);last=None
for i in range(33):
    z=1.078+i*(1.569-1.078)/32;row=[]
    for x in [-.013,.013]:
        co,w=sample(x,z);co.y-=.001;row.append(placket.vertex(co,w))
    if last:placket.face((last[0],last[1],row[1],row[0]))
    last=row
finish(placket.object(),.001)
collar=h.Surface('officer-folded-surface-fitted-collar',rig,[trim])
for sign in [-1,1]:
    rows=[]
    for j in range(9):
        t=j/8;row=[]
        for i in range(13):
            u=i/12;x=sign*((.026*(1-u)+.104*u)*(1-t)+(.069+.004*u)*t)
            z=(1.578*(1-u)+1.569*u)*(1-t)+1.518*t
            co,w=sample(x,z);co.y-=.003;row.append(collar.vertex(co,w))
        rows.append(row)
    for a,b in zip(rows,rows[1:]):
        for i in range(len(a)-1):collar.face((a[i],a[i+1],b[i+1],b[i]))
finish(collar.object(),.0015)
tie=h.Surface('officer-tie-following-chest',rig,[black]);last=None
for j in range(33):
    t=j/32;z=1.563-.325*t;width=.016+.006*t
    if t>.88:width*=max(.02,(1-t)/.12)
    row=[]
    for x in [-width,width]:
        co,w=sample(x,z);co.y-=.006;row.append(tie.vertex(co,w))
    if last:tie.face((last[0],last[1],row[1],row[0]))
    last=row
finish(tie.object(),.002)
surface_patch('officer-tie-knot',[(-.018,1.565),(.018,1.565),(.014,1.537),(-.014,1.537)],black,.008)
surface_patch('officer-brass-tie-clip',[(-.025,1.414),(.025,1.414),(.025,1.408),(-.025,1.408)],gold,.009)
for sign in [-1,1]:
    surface_patch('officer-uniform-pocket-'+str(sign),[(sign*.080,1.451),(sign*.165,1.451),(sign*.165,1.368),(sign*.123,1.359),(sign*.080,1.368)],shirt,.003)
    surface_patch('officer-pocket-flap-'+str(sign),[(sign*.079,1.453),(sign*.166,1.453),(sign*.166,1.430),(sign*.123,1.417),(sign*.079,1.430)],trim,.006)
surface_patch('officer-small-brass-shield',[(.104,1.424),(.143,1.424),(.146,1.397),(.124,1.378),(.102,1.397)],gold,.010)
for i in [6,7]:
    z=1.56-i*.060
    surface_patch('officer-shirt-brass-button-%02d'%i,[(.0035*math.cos(math.tau*j/12),z+.0035*math.sin(math.tau*j/12)) for j in range(12)],gold,.007)

# A rounded fabric cap covers the short fitted hair. The visor is a closed
# curved shell and the crown has a smooth sewn outline, no pointed helmet.
cap=h.loft('officer-sewn-cap-band',rig,[(0,.010,1.872,.133,.146),(0,.010,1.899,.136,.150)],trim,'head',64);finish(cap)
crown=h.loft('officer-rounded-police-cap',rig,[(0,.018,1.895,.137,.151),(0,.016,1.923,.159,.168),(0,.018,1.950,.163,.167),(0,.022,1.974,.130,.140),(0,.022,1.987,.062,.070),(0,.022,1.988,.001,.001)],shirt,'head',64);finish(crown)
visor=h.Surface('officer-closed-curved-cap-visor',rig,[black]);rings=[]
for j in range(5):
    t=j/4;row=[]
    for i in range(65):
        a=-math.pi/2+math.pi*i/64;x=(.133+.004*t)*math.sin(a)
        y=.010-(.146+.075*t)*math.cos(a);z=1.880-.012*t-.006*math.cos(a)
        row.append(visor.vertex((x,y,z),{'head':1}))
    rings.append(row)
for a,b in zip(rings,rings[1:]):
    for i in range(len(a)-1):visor.face((a[i],a[i+1],b[i+1],b[i]))
finish(visor.object(),.005)
# Raised but flush emblem attached to the cap front, not a dangling cube.
s=h.Surface('officer-cap-brass-emblem',rig,[gold]);outline=[(-.018,1.930),(-.016,1.953),(0,1.965),(.016,1.953),(.018,1.930),(0,1.918)]
s.face([s.vertex((x,-.151,z),{'head':1}) for x,z in outline]);finish(s.object(),.003)

rig['visualStyle']='universal-rounded-officer'
rig['sourceBody']='Superhero_Male_FullBody.fbx'
rig['originalBoneCount']=65
rig['preservesSourceHierarchy']=True
rig['referencePose']='seated-at-reception-keyboard'
rig['uniformConstruction']='continuous original torso-to-wrist surface with source skin weights'
for obj in rig.children:
    if obj!=main and 'supportSurface' in obj:del obj['supportSurface']
main['supportSurface']=True
for obj in rig.children:
    if obj.type=='MESH':finish(obj)
# Model validation before saving the native source and actual runtime asset.
assert len(rig.data.bones)==65
for obj in rig.children:
    if obj.type!='MESH':continue
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
    for vertex in obj.data.vertices:
        total=sum(g.weight for g in vertex.groups)
        assert abs(total-1)<2e-4,(obj.name,vertex.index,total)
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public/models/officer-duty.blend'))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in rig.children:
    if obj.type=='MESH':obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'src/assets/officer-duty.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_extras=True)
print('ROUNDED OFFICER EXPORTED',len(rig.data.bones),'original joints',flush=True)
