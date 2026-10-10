"""Build both NPCs only from the newly submitted Universal Base FBX models.
The complete original skeleton hierarchy and all original body/head meshes are retained.
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
 def point(p,weights=None):
  x,y,z=p.x,-p.y,p.z
  head_amount=sum(v for n,v in (weights or {}).items() if n=='Head') if weights is not None else max(0,min(1,(z-head_z)/.075))
  if head_amount>.2:
   # Skull and face are widened as one continuous source mesh.
   f=1+.24*head_amount;x*=f;y*=f;z=head_z+(z-head_z)*(1+.12*head_amount)
  else:
   torso=math.exp(-((z-1.09)/.28)**4);core=math.exp(-(abs(x)/.23)**4)
   x*=1+(.56 if woman else .22)*torso*core
   y*=1+(.52 if woman else .45)*torso*core
   # Full hips and thighs are grown around the original leg axes.
   leg=sum(v for n,v in (weights or {}).items() if n.startswith(('thigh','calf'))) if weights else 0
   if leg>.2:
    centre=math.copysign(.1114 if woman else .1143,x);factor=1+(.50 if woman else .17)*leg*math.exp(-((z-.76)/.24)**2)
    x=centre+(x-centre)*factor;y*=factor
   arm=sum(v for n,v in (weights or {}).items() if n.startswith(('upperarm','lowerarm'))) if weights else 0
   if arm>.2:
    centre_z=1.4181 if woman else 1.4555;centre_y=.055 if woman else .065
    factor=1+(.50 if woman else .22)*arm;y=centre_y+(y-centre_y)*factor;z=centre_z+(z-centre_z)*factor
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
 skin=h.material('universal-'+kind+'-skin','D5A171' if woman else 'BC8057');shirt=h.material('universal-denim' if woman else 'universal-plaid','497E9C' if woman else 'DAE3DF');dress=h.material('universal-lime-dress','BED63B');pants=h.material('universal-olive-trousers','777852');shoes=h.material('universal-shoes','32312A');hairmat=h.material('universal-red-hair' if woman else 'universal-brown-hair','8E2918' if woman else '5D3920');white=h.material('universal-eye-white','F0E9D9');iris=h.material('universal-iris','52633A' if woman else '65482A');pupil=h.material('universal-pupil','24201A')
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
   for v in obj.data.vertices:v.co.y-=.020
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
   image=bpy.data.images.new('universal-'+kind+'-eye-paint',width=128,height=128);pixels=[]
   for iy in range(128):
    for ix in range(128):
     r=math.hypot((ix+.5)/128-.5,(iy+.5)/128-.5);c=(.08,.06,.045,1) if r<.095 else ((.44,.52,.32,1) if woman else (.51,.36,.24,1)) if r<.20 else (.95,.94,.88,1);pixels.extend(c)
   image.pixels=pixels;image.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(coord.outputs['UV'],tex.inputs[0]);links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
   obj.shape_key_add(name='Basis');blink=obj.shape_key_add(name='Blink');eyez=sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices)
   for v in blink.data:v.co.z=eyez+(v.co.z-eyez)*.04
  elif 'Eyebrows'==obj.name:
   obj.name='universal-'+kind+'-brows';obj.data.materials.append(hairmat)
   for v in obj.data.vertices:
    if woman:v.co.z+=(abs(v.co.x)-.045)*.27
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
    elif leg>.45:p.material_index=2 if woman and raw.z>.58 else 0 if woman and raw.z>.115 else 3 if raw.z<.115 else 2
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
 bpy.data.objects.remove(original,do_unlink=True)
 # Fit hairstyles from the same newly provided pack using the same head transform.
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(SRC/('Hair_Long.fbx' if woman else 'Hair_SimpleParted.fbx')));added=set(bpy.data.objects)-before
 for obj in added:
  if obj.type!='MESH':continue
  world=obj.matrix_world.copy()
  for v in obj.data.vertices:
   raw=world@v.co;raw.x=-raw.x;raw.y=-raw.y;v.co=point(raw,{'Head':1})
   if woman and v.co.y>0 and v.co.z<1.66:v.co.y+=.035+(1.66-v.co.z)*.18
  bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
  obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear();g=obj.vertex_groups.new(name='head');g.add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.clear();mod=obj.modifiers.new('Universal hair attachment','ARMATURE');mod.object=rig;obj.data.materials.clear();obj.data.materials.append(hairmat);obj.name='universal-'+kind+'-hair'
  for p in obj.data.polygons:p.use_smooth=True;p.material_index=0
 # Fashion the seated skirt, collar, pockets and knot as clothing edits.
 if woman:
  s=h.Surface('universal-seated-dress-skirt',rig,[dress]);shells=[]
  for inside in [False,True]:
   rings=[]
   for z,rx,ry,cy in [(1.105,.229,.150,0),(1.210,.269,.189,-.140),(1.200,.285,.181,-.255),(1.120,.282,.120,-.341)]:
    f=.004 if inside else 0;ring=[s.vertex(((rx-f)*math.sin(TAU*i/64),cy-(ry-f)*math.cos(TAU*i/64),z),{'hips':1}) for i in range(64)];rings.append(ring)
   for a,b in zip(rings,rings[1:]):s.strip(a,b)
   shells.append(rings)
  s.strip(shells[1][0],shells[0][0]);s.strip(shells[0][-1],shells[1][-1]);skirt=s.object()
  for p in skirt.data.polygons:p.use_smooth=True
  h.loft('universal-denim-knot',rig,[(0,-.250,1.111,.025,.016),(0,-.272,1.119,.038,.024),(0,-.245,1.137,.023,.013)],shirt,'spine',16)
  for sign in [-1,1]:h.patch('universal-denim-tie',rig,[(sign*.009,-.275,1.119),(sign*.047,-.273,1.113),(sign*.090,-.248,1.071),(sign*.058,-.264,1.058),(sign*.023,-.284,1.092)],shirt)
 for sign in [-1,1]:
  collar=h.patch('universal-shirt-collar',rig,[(sign*.045,-.075,1.616 if not woman else 1.586),(sign*.130,-.105 if not woman else -.125,1.568 if not woman else 1.540),(sign*.102,-.125 if not woman else -.187,1.492 if not woman else 1.468),(sign*.040,-.105 if not woman else -.160,1.560 if not woman else 1.545)],shirt)
  bpy.context.view_layer.objects.active=collar;solid=collar.modifiers.new('Cloth edge thickness','SOLIDIFY');solid.thickness=.002;bpy.ops.object.modifier_apply(modifier=solid.name)
  if not woman:h.plaid(collar,0)
 if not woman:
  # The comic expression is an edit of this source character, not a reused head.
  tongue=h.material('universal-comic-tongue','C46B68');s=h.Surface('universal-comic-tongue',rig,[tongue]);centre=point(Vector((.012,.114,1.633)),{'Head':1})+Vector((.019,.010,-.009));rings=[]
  for j in range(13):
   angle=math.pi*j/12;ring=[]
   for i in range(24):
    a=TAU*i/24;v=centre+Vector((.027*math.sin(angle)*math.cos(a),.038*math.sin(angle)*math.sin(a),.012*math.cos(angle)));ring.append(s.vertex(v,{'head':1}))
   rings.append(ring)
  for a,b in zip(rings,rings[1:]):s.strip(a,b)
  obj=s.object()
  for p in obj.data.polygons:p.use_smooth=True
 rig['visualStyle']='universal-reference';rig['sourceBody']=f'Superhero_{sex}_FullBody.fbx';rig['originalBoneCount']=len(source);rig['preservesSourceHierarchy']=True;rig['referencePose']='crossed-arms-angry' if woman else 'seated-comic';rig['weightEdit']='fuller waist, abdomen, hips, thighs and upper arms'
 # Keep source history in the native file and write actual game assets.
 bpy.data.orphans_purge(do_recursive=True);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'public/models/detainee-{kind}.blend'))
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for obj in rig.children:
  if obj.type=='MESH':obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/f'src/assets/detainee-{kind}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_extras=True)
 print('UNIVERSAL EXPORTED',kind,len(rig.data.bones),'original joints',flush=True)

build(True)
build(False)
