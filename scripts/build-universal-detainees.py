"""Adapt both supplied Universal Base FBX bodies into the reference cell NPCs.
Keep the 65-joint source hierarchy and visible anatomy; tailor clothing and sculpt faces.
Run: blender -b --factory-startup --python-exit-code 1 --python scripts/build-universal-detainees.py
"""
import bpy,bmesh,math,importlib.util
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'public/models/universal-sources'
spec=importlib.util.spec_from_file_location('mesh_tools',ROOT/'scripts/build-detainees.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
TAU=math.tau

def aliases():
 m={'pelvis':'hips','spine_01':'spine','neck_01':'neck','Head':'head'}
 for suffix,side in [('l','L'),('r','R')]:
  for old,new in [('upperarm','upper_arm'),('lowerarm','forearm'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot')]:m[old+'_'+suffix]=new+'.'+side
  for i,old in enumerate(['index','middle','ring','pinky']):m[old+'_01_'+suffix]=f'finger{i}.{side}'
  m['thumb_01_'+suffix]='thumb.'+side
 return m

def build(woman):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 kind='woman' if woman else 'man';sex='Female' if woman else 'Male';bpy.ops.import_scene.fbx(filepath=str(SRC/f'Superhero_{sex}_FullBody.fbx'))
 original=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];names=aliases();scale=1.065 if woman else 1.045;head_z=1.5496 if woman else 1.5998
 source={b.name:(original.matrix_world@b.head_local,original.matrix_world@b.tail_local,b.parent.name if b.parent else None) for b in original.data.bones}
 leg_axes={}
 def point(p,weights=None):
  x,y,z=p.x,-p.y,p.z
  raw_point=Vector((x,y,z))
  head_amount=sum(v for n,v in (weights or {}).items() if n=='Head') if weights is not None else max(0,min(1,(z-head_z)/.075))
  if head_amount>.2:
   # Skull and face are widened as one continuous source mesh.
   f=1+.24*head_amount;x*=f;y*=f;z=head_z+(z-head_z)*(1+.12*head_amount)
  else:
   torso=math.exp(-((z-1.09)/.28)**4);core=math.exp(-(abs(x)/.23)**4)
   arm=sum(v for n,v in (weights or {}).items() if n.startswith(('upperarm','lowerarm')))
   leg=sum(v for n,v in (weights or {}).items() if n.startswith(('thigh','calf')))
   cloth_core=torso*core*(1-arm)*(1-leg if woman else 1)
   x*=1+(.56 if woman else .40)*cloth_core
   y*=1+(.52 if woman else .75)*cloth_core
   if y>0:y*=1-(.25 if woman else .38)*cloth_core
   # Full hips and thighs are grown around the original leg axes.
   if leg>.2:
    if woman:
     # Shape about the uploaded leg's actual axis and retarget its centre to the
     # adapted skeleton. Expanding absolute X twice (torso + thigh) produced the
     # long skin ribbons sticking out beside the seated skirt.
     side='l' if raw_point.x<0 else 'r';calf=sum(v for n,v in weights.items() if n.startswith('calf'));thigh=sum(v for n,v in weights.items() if n.startswith('thigh'));name=('calf_' if calf>thigh else 'thigh_')+side
     if name not in leg_axes:
      a,b,_=source[name];leg_axes[name]=(Vector((a.x,-a.y,a.z)),Vector((b.x,-b.y,b.z)),point(a),point(b))
     a,b,da,db=leg_axes[name];axis=b-a;t=max(0,min(1,(raw_point-a).dot(axis)/axis.length_squared));centre=a+axis*t
     fullness=1.40 if calf<=thigh else 1+.28*(1-t)
     fitted=da.lerp(db,t)+(raw_point-centre)*scale*fullness
     return (Vector((x,y,z))*scale).lerp(fitted,leg)
    centre=math.copysign(.1114 if woman else .1143,x);factor=1+(.70 if woman else .17)*leg*math.exp(-((z-.76)/(.34 if woman else .24))**2)
    x=centre+(x-centre)*factor;y*=factor
   if arm>.2:
    # Expand about the actual source limb axis. A fixed shoulder-height axis
    # shifted the elbow surface outwards when the forearm bent.
    side='l' if x<0 else 'r';axis_name=('upperarm_' if sum(v for n,v in (weights or {}).items() if n.startswith('upperarm'))>sum(v for n,v in (weights or {}).items() if n.startswith('lowerarm')) else 'lowerarm_')+side
    a,b,_=source[axis_name];start=Vector((a.x,-a.y,a.z));end=Vector((b.x,-b.y,b.z));axis=end-start
    t=max(0,min(1,(Vector((x,y,z))-start).dot(axis)/axis.length_squared));centre=start+axis*t
    factor=1+(.10 if woman else .06)*arm;y=centre.y+(y-centre.y)*factor;z=centre.z+(z-centre.z)*factor
   shoulder=.1516 if woman else .212;shift=.055 if woman else .022
   if abs(x)>shoulder:x+=math.copysign(shift*min(1,(abs(x)-shoulder)/.07),x)
  return Vector((x,y,z))*scale
 # Fresh bind matrices, same 65 source joints and parent relationships.
 data=bpy.data.armatures.new('universal-'+kind+'-skeleton');rig=bpy.data.objects.new('detainee-'+kind+'-rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,(a,b,parent) in source.items():
  bone=data.edit_bones.new(names.get(name,name));bone.head=point(a);bone.tail=point(b)
 for name,(a,b,parent) in source.items():
  if parent:data.edit_bones[names.get(name,name)].parent=data.edit_bones[names.get(parent,parent)]
 bpy.ops.object.mode_set(mode='OBJECT')
 skin=h.material('universal-'+kind+'-skin','DCAA77' if woman else 'C4895B');shirt=h.material('universal-denim' if woman else 'universal-plaid','497E9C' if woman else 'DAE3DF');dress=h.material('universal-lime-dress','BED63B');pants=h.material('universal-olive-trousers','777852');shoes=h.material('universal-shoes','32312A');hairmat=h.material('universal-red-hair' if woman else 'universal-brown-hair','8E2918' if woman else '5D3920');white=h.material('universal-eye-white','F0E9D9');iris=h.material('universal-iris','52633A' if woman else '65482A');pupil=h.material('universal-pupil','24201A')
 main=None;eyes=None
 for obj in meshes:
  world=obj.matrix_world.copy();weights=[];rest=[]
  for v in obj.data.vertices:
   w={obj.vertex_groups[g.group].name:g.weight for g in v.groups};total=sum(w.values());assert total>1e-8
   w={n:a/total for n,a in w.items()};rest.append(world@v.co);v.co=point(rest[-1],w);weights.append(w)
  obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear()
  groups={n:obj.vertex_groups.new(name=names.get(n,n)) for n in {n for w in weights for n in w}}
  for i,w in enumerate(weights):
   for n,a in w.items():groups[n].add([i],a,'REPLACE')
  bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
  obj.modifiers.clear();mod=obj.modifiers.new('Original Universal skeleton','ARMATURE');mod.object=rig
  for poly in obj.data.polygons:poly.use_smooth=True
  oldslots=[p.material_index for p in obj.data.polygons];obj.data.materials.clear()
  if 'Eyes'==obj.name:
   for side in [True,False]:
    verts=[v for v in obj.data.vertices if (v.co.x<0)==side];cy=sum(v.co.y for v in verts)/len(verts);cz=sum(v.co.z for v in verts)/len(verts)
    for v in verts:v.co.y=cy-.012+(v.co.y-cy)*.38;v.co.z=cz+(v.co.z-cz)*.90
   eyes=obj;obj.name='universal-'+kind+'-eyes';obj.data.materials.append(white);obj.data.materials.append(pupil)
   # The supplied FBX has untextured eye whites; paint an iris/pupil on
   # their original surface rather than attaching floating eye plates.
   centres={side:((min(v.co.x for v in obj.data.vertices if (v.co.x<0)==side)+max(v.co.x for v in obj.data.vertices if (v.co.x<0)==side))/2,(min(v.co.z for v in obj.data.vertices if (v.co.x<0)==side)+max(v.co.z for v in obj.data.vertices if (v.co.x<0)==side))/2) for side in [True,False]}
   uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UniversalEyePaint')
   for poly in obj.data.polygons:
    poly.material_index=0
    for loop in poly.loop_indices:
     v=obj.data.vertices[obj.data.loops[loop].vertex_index].co;cx,cz=centres[v.x<0];uv.data[loop].uv=(.5+(v.x-cx)/.065,.5+(v.z-cz)/.065)
   nodes=white.node_tree.nodes;links=white.node_tree.links;coord=nodes.new('ShaderNodeTexCoord');distance=nodes.new('ShaderNodeVectorMath');distance.operation='DISTANCE';distance.inputs[1].default_value=(.5,.5,0);links.new(coord.outputs['UV'],distance.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
   ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=(.018,.014,.012,1);ramp.color_ramp.elements[1].position=.20;ramp.color_ramp.elements[1].color=(.88,.86,.78,1);ramp.color_ramp.elements.new(.095).color=(.16,.22,.085,1) if woman else (.23,.12,.05,1)
   links.new(distance.outputs['Value'],ramp.inputs[0]);links.new(ramp.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
   # Bake a portable texture because glTF cannot export procedural math.
   eye_size=512
   image=bpy.data.images.new('universal-'+kind+'-eye-paint',width=eye_size,height=eye_size);pixels=[]
   for iy in range(eye_size):
    for ix in range(eye_size):
     r=math.hypot((ix+.5)/eye_size-(.54 if woman else .5),(iy+.5)/eye_size-.5);c=(.08,.06,.045,1) if r<(.085 if woman else .060) else ((.44,.52,.32,1) if woman else (.51,.36,.24,1)) if r<(.19 if woman else .13) else (.95,.94,.88,1);pixels.extend(c)
   image.pixels=pixels;image.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(coord.outputs['UV'],tex.inputs[0]);links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
   obj.shape_key_add(name='Basis');blink=obj.shape_key_add(name='Blink');eyez=sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices)
   for v in blink.data:v.co.z=eyez+(v.co.z-eyez)*.04
  elif 'Eyebrows'==obj.name:
   obj.name='universal-'+kind+'-brows';obj.data.materials.append(h.material('universal-'+kind+'-brows','593521' if woman else '4F3323'))
   for v in obj.data.vertices:
    if woman:v.co.z+=(abs(v.co.x)-.045)*.10
    else:v.co.z+=.008 if v.co.x<0 else -.001
   for p in obj.data.polygons:p.material_index=0
  else:
   main=obj;obj.name='universal-'+kind+'-continuous-body';obj.data.materials.append(skin);obj.data.materials.append(shirt);obj.data.materials.append(dress if woman else pants);obj.data.materials.append(shoes)
   for p in obj.data.polygons:
    ws={};raw=Vector((0,0,0))
    for index in p.vertices:
     raw+=rest[index]/len(p.vertices)
     for n,a in weights[index].items():ws[n]=ws.get(n,0)+a/len(p.vertices)
    head=sum(a for n,a in ws.items() if n in ['Head','neck_01']);arm=sum(a for n,a in ws.items() if n.startswith(('upperarm','lowerarm')));hand=sum(a for n,a in ws.items() if n.startswith(('hand','index','middle','ring','pinky','thumb')));leg=sum(a for n,a in ws.items() if n.startswith(('thigh','calf','foot','ball')))
    if head>.55 or hand>.5:p.material_index=0
    elif leg>.45:p.material_index=0 if woman and raw.z>.115 else 3 if raw.z<.115 else 2
    elif arm>.4:
     p.material_index=1 if sum(a for n,a in ws.items() if n.startswith('upperarm'))>.35 or abs(raw.x)<(.47 if woman else .54) else 0
    elif raw.z<1.025:p.material_index=2
    elif woman and raw.y>.012 and abs(raw.x)<.064 and raw.z<1.37:p.material_index=2
    else:p.material_index=1
   if not woman:
    for uv in list(obj.data.uv_layers):obj.data.uv_layers.remove(uv)
    h.plaid(obj,1)
   # The source is one continuous surface; no assembled shoulder/wrist seams.
   bpy.context.view_layer.objects.active=obj;sub=obj.modifiers.new('Smooth original body','SUBSURF');sub.levels=1
   while obj.modifiers.find(sub.name)>0:bpy.ops.object.modifier_move_up(modifier=sub.name)
   bpy.ops.object.modifier_apply(modifier=sub.name)
 if not woman:
  trousers=main.copy();trousers.data=main.data.copy();bpy.context.collection.objects.link(trousers);trousers.name='universal-man-tailored-trousers'
  bm=bmesh.new();bm.from_mesh(trousers.data);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index!=2],context='FACES');bm.normal_update()
  for v in bm.verts:v.co+=v.normal*.007
  bm.to_mesh(trousers.data);bm.free();trousers.data.materials.clear();trousers.data.materials.append(pants)
  for face in trousers.data.polygons:face.material_index=0;face.use_smooth=True
  bpy.context.view_layer.objects.active=trousers;mod=trousers.modifiers.new('Loose trouser fabric','SMOOTH');mod.factor=.5;mod.iterations=4;bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)
  for face in main.data.polygons:
   if face.material_index==2:face.material_index=0
 # Tailor a separate shell from the source surface and retain its weights.
 cloth=main.copy();cloth.data=main.data.copy();bpy.context.collection.objects.link(cloth);cloth.name='universal-'+kind+'-tailored-shirt'
 bm=bmesh.new();bm.from_mesh(cloth.data);drop=[]
 for face in bm.faces:
  c=face.calc_center_median();opening=woman and c.y<-.035 and abs(c.x)<(.057+max(0,1.52-c.z)*.10)
  if face.material_index!=1 or opening or (woman and c.z<1.235 and abs(c.x)<.26):drop.append(face)
 bmesh.ops.delete(bm,geom=drop,context='FACES');bm.normal_update()
 for v in bm.verts:
  v.co+=v.normal*.009
  # Smooth the shirt over the source chest and the open front edges.
  if abs(v.co.x)<.19 and v.co.y<-.05:v.co.y-=.008
 if woman:
  for v in bm.verts:
   if v.is_boundary and v.co.y<-.075 and 1.15<v.co.z<1.50 and abs(v.co.x)<.145:
    v.co.x=math.copysign(.063+(1.48-v.co.z)*.09,v.co.x)
 if not woman:
  for v in bm.verts:
   if v.is_boundary and abs(v.co.x)<.13 and v.co.z>1.54:v.co.z=1.598+.010*math.tanh(v.co.y/.06)
 # Rolled cuff strips follow exactly the source sleeve boundary and weights.
 cuffmat=h.material('universal-'+kind+'-turned-cuff','7595AB' if woman else 'E0E7DF');cuffs=h.Surface('universal-'+kind+'-rolled-cuffs',rig,[cuffmat]);deform=bm.verts.layers.deform.active
 for edge in bm.edges:
  if not edge.is_boundary or min(abs(v.co.x) for v in edge.verts)<.43:continue
  outer=[];inner=[]
  for v in edge.verts:
   w={cloth.vertex_groups[g].name:a for g,a in v[deform].items() if a>1e-7};total=sum(w.values());w={g:a/total for g,a in w.items()};offset=Vector((-math.copysign(.027,v.co.x),0,0))
   outer.append(cuffs.vertex(v.co+v.normal*.009,w));inner.append(cuffs.vertex(v.co+offset+v.normal*.011,w))
  cuffs.face((outer[0],outer[1],inner[1],inner[0]))
 cuff=cuffs.object()
 for face in cuff.data.polygons:face.use_smooth=True
 bm.to_mesh(cloth.data);bm.free();cloth.data.materials.clear();cloth.data.materials.append(shirt)
 for face in cloth.data.polygons:face.material_index=0;face.use_smooth=True
 bpy.context.view_layer.objects.active=cloth
 smooth=cloth.modifiers.new('Tailored fabric smoothing','SMOOTH');smooth.factor=.6;smooth.iterations=5
 while cloth.modifiers.find(smooth.name)>0:bpy.ops.object.modifier_move_up(modifier=smooth.name)
 bpy.ops.object.modifier_apply(modifier=smooth.name)
 solid=cloth.modifiers.new('Real fabric thickness','SOLIDIFY');solid.thickness=.004;solid.offset=0
 while cloth.modifiers.find(solid.name)>0:bpy.ops.object.modifier_move_up(modifier=solid.name)
 bpy.ops.object.modifier_apply(modifier=solid.name)
 if not woman:h.plaid(cloth,0)
 for face in main.data.polygons:
  if face.material_index==1:face.material_index=2 if woman else 0
  centre=sum((main.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
  if woman and face.material_index==2 and centre.z>1.48 and abs(centre.x)<.11 and centre.y<-.03:face.material_index=0
 if woman:
  # Build a loose blouse across the chest instead of tracing individual breasts.
  # Keep the source sleeves and their source skin weights.
  bm=bmesh.new();bm.from_mesh(cloth.data);deform=bm.verts.layers.deform.active;drop=[]
  for face in bm.faces:
   arm=sum(sum(a for g,a in v[deform].items() if cloth.vertex_groups[g].name.startswith(('upper_arm','forearm'))) for v in face.verts)/len(face.verts)
   if arm<.45:drop.append(face)
  bmesh.ops.delete(bm,geom=drop,context='FACES');bm.to_mesh(cloth.data);bm.free()
  s=h.Surface('universal-woman-loose-blouse',rig,[shirt]);rings=[]
  profiles=[(1.245,.265,.260,.210),(1.300,.260,.250,.190),(1.400,.255,.235,.160),(1.480,.245,.205,.140),(1.540,.240,.145,.120),(1.565,.230,.105,.100),(1.605,.095,.075,.085)]
  for z,rx,frontdepth,backdepth in profiles:
   width=.078 if z<1.48 else .045+.033*max(0,(1.60-z)/.12);angle=math.asin(width/rx);ring=[]
   for i in range(97):
    a=angle+(TAU-2*angle)*i/96;c=math.cos(a);x=rx*math.sin(a);y=-math.copysign((frontdepth if c>0 else backdepth)*abs(c)**.5,c)
    ring.append(s.vertex((x,y,z),{'spine_03':1}))
   rings.append(ring)
  for a,b in zip(rings,rings[1:]):
   for i in range(len(a)-1):s.face((a[i],a[i+1],b[i+1],b[i]))
  blouse=s.object()
  for face in blouse.data.polygons:face.use_smooth=True
  bpy.context.view_layer.objects.active=blouse;sub=blouse.modifiers.new('Smooth tailored blouse','SUBSURF');sub.levels=2;bpy.ops.object.modifier_move_up(modifier=sub.name);bpy.ops.object.modifier_apply(modifier=sub.name)
  solid=blouse.modifiers.new('Blouse fabric thickness','SOLIDIFY');solid.thickness=.003;bpy.ops.object.modifier_move_up(modifier=solid.name);bpy.ops.object.modifier_apply(modifier=solid.name)
  cloth=blouse
  # A real underdress gives a smooth neckline; no material boundary on skin.
  for face in main.data.polygons:
   if face.material_index==2:face.material_index=0
  s=h.Surface('universal-woman-underdress-bodice',rig,[dress]);rings=[]
  for j in range(13):
   t=j/12;ring=[]
   for i in range(96):
    a=TAU*i/96;c=math.cos(a);rx=.250-.035*t;depth=(.220-.012*t) if c>0 else (.205-.060*t);z=1.240+(1.515-.085*max(0,c)**2-1.240)*t
    ring.append(s.vertex((rx*math.sin(a),-math.copysign(depth*abs(c)**.5,c),z),{'spine_03':1}))
   rings.append(ring)
  for a,b in zip(rings,rings[1:]):s.strip(a,b)
  bodice=s.object()
  for face in bodice.data.polygons:face.use_smooth=True
  bpy.context.view_layer.objects.active=bodice;solid=bodice.modifiers.new('Underdress fabric thickness','SOLIDIFY');solid.thickness=.003;bpy.ops.object.modifier_move_up(modifier=solid.name);bpy.ops.object.modifier_apply(modifier=solid.name)
 bpy.data.objects.remove(original,do_unlink=True)
 # Fit hairstyles from the same newly provided pack using the same head transform.
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(SRC/('Hair_Long.fbx' if woman else 'Hair_SimpleParted.fbx')));added=set(bpy.data.objects)-before
 for obj in added:
  if obj.type!='MESH':continue
  world=obj.matrix_world.copy()
  for v in obj.data.vertices:
   raw=world@v.co;raw.x=-raw.x;raw.y=-raw.y;v.co=point(raw,{'Head':1})
   if woman and v.co.z<1.82:
    z=v.co.z;t=max(0,min(1,(1.82-z)/.18));v.co.z=1.82+(z-1.82)*2.1
    y=v.co.y;target=(.215 if y>0 else .280)*math.tanh(y/.085);v.co.y=y*(1-t)+target*t
    v.co.x+=math.copysign(.12*t*math.exp(-(y/.10)**2),v.co.x)
  bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
  obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear();g=obj.vertex_groups.new(name='head');g.add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.clear();mod=obj.modifiers.new('Universal hair attachment','ARMATURE');mod.object=rig;obj.data.materials.clear();obj.data.materials.append(hairmat);obj.name='universal-'+kind+'-hair'
  for p in obj.data.polygons:p.use_smooth=True;p.material_index=0
  if woman:
   torso=obj.vertex_groups.new(name='spine_03')
   for v in obj.data.vertices:
    a=max(0,min(1,(v.co.z-1.42)/.25));a=a*a*(3-2*a);head=.40+.60*a
    g.add([v.index],head,'REPLACE')
    if head<1:torso.add([v.index],1-head,'REPLACE')
 # Fashion the seated skirt, collar, pockets and knot as clothing edits.
 if woman:
  s=h.Surface('universal-seated-dress-skirt',rig,[dress]);rings=[]
  for j in range(13):
   t=j/12;ring=[]
   for i in range(96):
    angle=TAU*i/96;front=max(0,math.cos(angle));rx=.250+.080*t;depth=.225+.32*t if math.cos(angle)>0 else .145
    fold=.004*math.sin(angle*8)*math.sin(math.pi*t)
    z=1.260-.180*t+(.035+.040*front)*math.sin(math.pi*t)
    ring.append(s.vertex(((rx+fold)*math.sin(angle),-depth*math.cos(angle),z),{'hips':1}))
   rings.append(ring)
  for a,b in zip(rings,rings[1:]):s.strip(a,b)
  skirt=s.object()
  for p in skirt.data.polygons:p.use_smooth=True
  bpy.context.view_layer.objects.active=skirt;solid=skirt.modifiers.new('Draped fabric thickness','SOLIDIFY');solid.thickness=.003;bpy.ops.object.modifier_move_up(modifier=solid.name);bpy.ops.object.modifier_apply(modifier=solid.name)
  h.loft('universal-denim-knot',rig,[(0,-.250,1.260,.025,.016),(0,-.272,1.275,.038,.024),(0,-.245,1.290,.023,.013)],shirt,'spine',16)
  for sign in [-1,1]:h.patch('universal-denim-tie',rig,[(sign*.009,-.250,1.283),(sign*.047,-.280,1.283),(sign*.090,-.360,1.270),(sign*.058,-.380,1.270),(sign*.023,-.290,1.290)],shirt)
 for sign in [-1,1]:
  collar=h.patch('universal-shirt-collar',rig,[(sign*.045,-.075,1.616 if not woman else 1.586),(sign*.130,-.105 if not woman else -.125,1.568 if not woman else 1.540),(sign*.102,-.125 if not woman else -.220,1.492 if not woman else 1.468),(sign*.040,-.105 if not woman else -.160,1.560 if not woman else 1.545)],shirt)
  bpy.context.view_layer.objects.active=collar;solid=collar.modifiers.new('Cloth edge thickness','SOLIDIFY');solid.thickness=.002;bpy.ops.object.modifier_apply(modifier=solid.name)
  if not woman:h.plaid(collar,0)
 if woman:h.denim_texture(rig,shirt)
 from mathutils.bvhtree import BVHTree
 tree=BVHTree.FromPolygons([v.co for v in cloth.data.vertices],[list(p.vertices) for p in cloth.data.polygons])
 def clothfront(x,z):
  hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
  return hit[0].y-.004 if hit[0] is not None else None
 for sign in [-1,1] if woman else [1]:
  pts=[]
  for x,z in [(sign*.095,1.448),(sign*.170,1.448),(sign*.167,1.388),(sign*.132,1.373),(sign*.098,1.388)]:
   y=clothfront(x,z)
   if y is not None:pts.append((x,y,z))
  if len(pts)==5:
   if woman:
    seam=h.material('universal-denim-stitch','829AAB');curve=bpy.data.curves.new('Pocket stitching','CURVE');curve.dimensions='3D';curve.bevel_depth=.0007;curve.bevel_resolution=2;line=curve.splines.new('POLY');line.points.add(len(pts)-1)
    for vertex,(x,y,z) in zip(line.points,pts):vertex.co=(x,y-.003,z,1)
    line.use_cyclic_u=True;obj=bpy.data.objects.new('universal-pocket-stitching',curve);bpy.context.collection.objects.link(obj);bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.data.materials.append(seam);obj.parent=rig;g=obj.vertex_groups.new(name='spine_03');g.add(list(range(len(obj.data.vertices))),1,'REPLACE');mod=obj.modifiers.new('Shirt skeleton','ARMATURE');mod.object=rig
   obj=h.patch('universal-'+kind+'-breast-pocket',rig,pts,shirt,'spine_03');bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Pocket fabric thickness','SOLIDIFY');mod.thickness=.002;bpy.ops.object.modifier_apply(modifier=mod.name)
 metal=h.material('universal-'+kind+'-shirt-buttons','D8D4BC')
 for i in range(5):
  z=1.47-i*.052;x=.081+(1.47-z)*.09 if woman else 0;y=clothfront(x,z)
  if y is not None:h.patch('universal-shirt-button',rig,[(x+.004*math.cos(TAU*j/12),y-.002,z+.004*math.sin(TAU*j/12)) for j in range(12)],metal,'spine_03')
  rig['visualStyle']='universal-reference';rig['sourceBody']=f'Superhero_{sex}_FullBody.fbx';rig['originalBoneCount']=len(source);rig['preservesSourceHierarchy']=True;rig['referencePose']='crossed-arms-angry' if woman else 'seated-comic';rig['weightEdit']='fuller waist, abdomen, hips, thighs and upper arms'
 # Keep source history in the native file and write actual game assets.
 main['supportSurface']=True
 hip_group=main.vertex_groups['hips'].index
 rig['restHipSupportHeight']=min(v.co.z for v in main.data.vertices if sum(g.weight for g in v.groups if g.group==hip_group)>=.40)
 materials={'skin':skin,'shirt':shirt,'dress':dress,'pants':pants,'shoes':shoes,'hair':hairmat,'eye_white':white,'iris':iris,'pupil':pupil}
 for module_name,function_name,args in [
  ('detainee-female-clothing','improve_female',(rig,main,h,materials)) if woman else ('detainee-male-clothing','improve_male',(rig,main,h,materials)),
  ('detainee-faces-hair','improve_faces_hair',(rig,main,h,materials,woman)),
 ]:
  file=ROOT/'scripts'/f'{module_name}.py'
  if not file.is_file():raise FileNotFoundError(f'Required NPC editing module missing: {file}')
  spec=importlib.util.spec_from_file_location(module_name.replace('-','_'),file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);getattr(module,function_name)(*args)
 for obj in rig.children:
  if obj!=main and 'supportSurface' in obj:del obj['supportSurface']
 bpy.data.orphans_purge(do_recursive=True);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'public/models/detainee-{kind}.blend'))
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for obj in rig.children:
  if obj.type=='MESH':obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/f'src/assets/detainee-{kind}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_extras=True)
 print('UNIVERSAL EXPORTED',kind,len(rig.data.bones),'original joints',flush=True)

build(True)
build(False)
