"""Adapt the user's modular FBX body and GLB head to the civilian game rig.
Run with Blender: -- /path/to/prepared.blend /path/to/head.glb
"""
import bpy,bmesh,math,sys,importlib.util
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('civilian_tools',ROOT/'scripts/build-detainees.py');helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
sourcefile,headfile=sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.wm.open_mainfile(filepath=sourcefile)
old=next(o for o in bpy.data.objects if o.type=='ARMATURE')
body=[o for o in old.children if o.type=='MESH' and 'short.001' not in o.name and 'jacket' not in o.name]
source_hair=next(o for o in old.children if o.type=='MESH' and 'short.001' in o.name)
hair_mesh=source_hair.data.copy();hair_mesh.transform(source_hair.matrix_world)
# Source rest positions in metres, Z-up. Keep the actual imported topology.
source={b.name:(old.matrix_world@b.head_local,old.matrix_world@b.tail_local) for b in old.data.bones}
scale=1.12
mapping={'CC_Base_Hip':'hips','CC_Base_Pelvis':'hips','CC_Base_Waist':'spine','CC_Base_Spine01':'spine','CC_Base_Spine02':'spine','CC_Base_NeckTwist01':'neck','CC_Base_NeckTwist02':'neck','CC_Base_Head':'head'}
for side in ['L','R']:
 target_side='R' if side=='L' else 'L'
 for prefix,target in [('Clavicle','spine'),('Upperarm','upper_arm'),('Forearm','forearm'),('Hand','hand'),('Thigh','thigh'),('Calf','shin'),('Foot','foot'),('ToeBase','foot')]:
  for suffix in ['', 'Twist01','Twist02']:
   mapping['CC_Base'+prefix+suffix+'.'+side]=target if target=='spine' else target+'.'+target_side
 for i,prefix in enumerate(['Index','Mid','Ring','Pinky']):
  for segment in [1,2,3]:mapping[f'CC_Base{prefix}{segment}.{side}']=f'finger{i}.{target_side}'
 for segment in [1,2,3]:mapping[f'CC_BaseThumb{segment}.{side}']='thumb.'+target_side
# Create an explicit 26-joint rig so the existing seated IK animation is reused.
data=bpy.data.armatures.new('uploaded-civilian-skeleton');rig=bpy.data.objects.new('detainee-man-rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=data.edit_bones.new(name);b.head=head*scale;b.tail=tail*scale
 if parent:b.parent=data.edit_bones[parent]
hips=source['CC_Base_Hip'][0];waist=source['CC_Base_Waist'][0];neck=source['CC_Base_NeckTwist01'][0];head=source['CC_Base_Head'][0]
bone('hips',hips,waist);bone('spine',waist,neck,'hips');bone('neck',neck,head,'spine');bone('head',head,head+Vector((0,0,.27)),'neck')
for side in ['L','R']:
 original='R' if side=='L' else 'L'
 ua=source['CC_BaseUpperarm.'+original][0];fa=source['CC_BaseForearm.'+original][0];hand=source['CC_BaseHand.'+original][0]
 bone('upper_arm.'+side,ua,fa,'spine');bone('forearm.'+side,fa,hand,'upper_arm.'+side)
 mid=source['CC_BaseMid1.'+original][0];bone('hand.'+side,hand,mid,'forearm.'+side)
 for i,prefix in enumerate(['Index','Mid','Ring','Pinky']):
  h=source[f'CC_Base{prefix}1.{original}'][0];t=source[f'CC_Base{prefix}3.{original}'][1];bone(f'finger{i}.{side}',h,t,'hand.'+side)
 bone('thumb.'+side,source['CC_BaseThumb1.'+original][0],source['CC_BaseThumb3.'+original][1],'hand.'+side)
 thigh=source['CC_BaseThigh.'+original][0];shin=source['CC_BaseCalf.'+original][0];foot=source['CC_BaseFoot.'+original][0]
 bone('thigh.'+side,thigh,shin,'hips');bone('shin.'+side,shin,foot,'thigh.'+side);bone('foot.'+side,foot,source['CC_BaseToeBase.'+original][1],'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT')
skin=helper.material('uploaded-man-warm-skin','C88859');shirt=helper.material('uploaded-man-plaid-shirt','DCE4DD');pants=helper.material('uploaded-man-olive-trousers','727552');shoe=helper.material('uploaded-man-dark-shoes','393930')
for obj in body:
 world=obj.matrix_world.copy();weights=[]
 for vertex in obj.data.vertices:
  vertex.co=(world@vertex.co)*scale
  combined={}
  for g in vertex.groups:
   name=obj.vertex_groups[g.group].name;target=mapping.get(name)
   if target:combined[target]=combined.get(target,0)+g.weight
  assert combined,(obj.name,vertex.index)
  if obj.name=='M_body_hips':combined={'hips':1}
  total=sum(combined.values());weights.append({n:w/total for n,w in combined.items()})
 obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear()
 groups={n:obj.vertex_groups.new(name=n) for n in {key for w in weights for key in w}}
 for i,w in enumerate(weights):
  for n,v in w.items():groups[n].add([i],v,'REPLACE')
 for mod in obj.modifiers:
  if mod.type=='ARMATURE':mod.object=rig
 obj.data.materials.clear();mat=shirt if obj.name.startswith(('M_body_torso','M_body_shoulders','M_body_arms_upper')) else pants if 'skinny' in obj.name or obj.name=='M_body_hips' else shoe if 'shoes' in obj.name else skin;obj.data.materials.append(mat)
 for p in obj.data.polygons:p.material_index=0;p.use_smooth=True
 if mat==shirt:
  for uv in list(obj.data.uv_layers):obj.data.uv_layers.remove(uv)
  helper.plaid(obj,0)
 # Bake the source surface subdivision, preserve the new armature modifier.
 bpy.context.view_layer.objects.active=obj
 for mod in list(obj.modifiers):
  if mod.type=='SUBSURF':
   while obj.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
   bpy.ops.object.modifier_apply(modifier=mod.name)
for obj in list(body):
 if obj.name.startswith(('M_body_legs','M_body_feet')):
  body.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
for obj in list(bpy.data.objects):
 if obj!=rig and obj not in body:bpy.data.objects.remove(obj,do_unlink=True)
# Import the actual submitted face. Delete the duplicated loose demonstration parts.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=headfile);imported=set(bpy.data.objects)-before
headmeshes=[]
for obj in imported:
 if obj.type!='MESH':continue
 world=obj.matrix_world.copy();points=[world@v.co for v in obj.data.vertices]
 if sum(p.x for p in points)/len(points)<-.6:
  bpy.data.objects.remove(obj,do_unlink=True);continue
 mats=[m.name.lower() for m in obj.data.materials];label=mats[0] if mats else 'skin'
 if label=='material_0':
  bpy.data.objects.remove(obj,do_unlink=True);continue
 for vertex,p in zip(obj.data.vertices,points):
  # Centre the skull at the body's neck. The original face points down -Y.
  vertex.co=Vector((p.x*.275,(p.y+.39)*.275,1.760+(p.z-1.5)*.285))
  if vertex.co.z>1.805:vertex.co.z=1.805+(vertex.co.z-1.805)*.72
  if label in ['skin','lips'] and vertex.co.y<-.08 and vertex.co.z<1.666:
   vertex.co.z-=.009*math.exp(-(vertex.co.x/.061)**4)*math.exp(-((vertex.co.z-1.655)/.025)**2)
 obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear()
 group=obj.vertex_groups.new(name='head');group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 if label=='skin':
  neckgroup=obj.vertex_groups.new(name='neck')
  for v in obj.data.vertices:
   blend=max(0,min(1,(v.co.z-1.555)/.055));group.add([v.index],blend,'REPLACE');neckgroup.add([v.index],1-blend,'REPLACE')
 obj.modifiers.clear();mod=obj.modifiers.new('Game civilian rig','ARMATURE');mod.object=rig
 obj.name='uploaded-face-'+label
 if label in ['skin','lips']:obj.data.materials.clear();obj.data.materials.append(skin)
 if label=='blue':obj.data.materials.clear();obj.data.materials.append(helper.material('uploaded-man-brown-iris','704727'))
 for p in obj.data.polygons:p.use_smooth=True
 sub=obj.modifiers.new('Smooth imported face','SUBSURF');sub.levels=1;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=sub.name)
 if label in ['white','blue','black']:
  obj.shape_key_add(name='Basis');blink=obj.shape_key_add(name='Blink')
  for point in blink.data:point.co.z=1.758+(point.co.z-1.758)*.04
 headmeshes.append(obj)
for obj in list(bpy.data.objects):
 if obj.type=='EMPTY':bpy.data.objects.remove(obj,do_unlink=True)
# Actual facial details attached to the head joint, not camera overlays.
Surface=helper.Surface

def blob(name,centre,radii,mat,rotation=0):
 s=Surface(name,rig,[mat]);rows=[];cx,cy,cz=centre;rx,ry,rz=radii
 for j in range(1,20):
  phi=-math.pi/2+math.pi*j/20;row=[]
  for i in range(32):
   a=math.tau*i/32;x=rx*math.cos(phi)*math.cos(a);z=rz*math.sin(phi)
   row.append(s.vertex((cx+x*math.cos(rotation)-z*math.sin(rotation),cy+ry*math.cos(phi)*math.sin(a),cz+x*math.sin(rotation)+z*math.cos(rotation)),{'head':1}))
  rows.append(row)
 for a,b in zip(rows,rows[1:]):s.strip(a,b)
 s.face(tuple(reversed(rows[0])));s.face(rows[-1]);o=s.object()
 for p in o.data.polygons:p.use_smooth=True
 return o
hair=helper.material('uploaded-man-brown-hair','664124')
# Keep the supplied hair topology, fitted to the new skull rather than inventing a cap.
obj=bpy.data.objects.new('uploaded-male-hair',hair_mesh);bpy.context.collection.objects.link(obj)
pts=[v.co.copy() for v in obj.data.vertices];low=Vector([min(p[i] for p in pts) for i in range(3)]);high=Vector([max(p[i] for p in pts) for i in range(3)])
for v,p in zip(obj.data.vertices,pts):
 v.co=Vector(((p.x-(low.x+high.x)/2)/(high.x-low.x)*.318,(p.y-(low.y+high.y)/2)/(high.y-low.y)*.253+.012,(p.z-low.z)/(high.z-low.z)*.105+1.835))
obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear();g=obj.vertex_groups.new(name='head');g.add(list(range(len(obj.data.vertices))),1,'REPLACE');mod=obj.modifiers.new('Head rig','ARMATURE');mod.object=rig;obj.data.materials.clear();obj.data.materials.append(hair)
for p in obj.data.polygons:p.use_smooth=True
headmeshes.append(obj)
# Swept dishevelled locks and asymmetrical raised eyebrows.
for i,(x,z,rot) in enumerate([(-.115,1.884,-.55),(-.072,1.915,-.40),(-.025,1.926,.22),(.025,1.914,.50),(.076,1.898,.70),(.114,1.872,.7)]):blob('swept-male-lock',(x,-.061,z),(.025,.038,.055),hair,rot)
for sign in [-1,1]:blob('expressive-male-brow',(sign*.054,-.132,1.800+(.012 if sign<0 else 0)),(.028,.005,.007),hair,rotation=.18)
# The FBX body stops below the neck, while the separate head has only a
# short neck stump. Bridge them with a real closed, weighted neck surface.
neckmesh=Surface('continuous-fitted-neck',rig,[skin]);rings=[]
for z,rx,ry,cy in [(1.435,.061,.050,0),(1.485,.057,.046,0),(1.535,.051,.043,-.006),(1.585,.047,.041,-.015),(1.625,.050,.045,-.018)]:
 h=max(0,min(1,(z-1.54)/.055));s=max(0,min(1,(1.49-z)/.055));weights={'spine':s,'neck':(1-s)*(1-h),'head':(1-s)*h}
 rings.append([neckmesh.vertex((rx*math.sin(math.tau*i/48),cy-ry*math.cos(math.tau*i/48),z),weights) for i in range(48)])
for a,b in zip(rings,rings[1:]):neckmesh.strip(a,b)
neckmesh.face(tuple(reversed(rings[0])));neckmesh.face(rings[-1]);n=neckmesh.object()
for p in n.data.polygons:p.use_smooth=True
# Collared shirt details have cloth thickness and follow the torso bone.
for sign in [-1,1]:
 collar=helper.patch('fitted-shirt-collar',rig,[(sign*.041,-.045,1.483),(sign*.091,-.058,1.453),(sign*.067,-.096,1.397),(sign*.020,-.079,1.449)],shirt)
 bpy.context.view_layer.objects.active=collar;solid=collar.modifiers.new('Collar thickness','SOLIDIFY');solid.thickness=.002;bpy.ops.object.modifier_apply(modifier=solid.name)
 helper.plaid(collar,0)
mouth=helper.material('comic-mouth-interior','49251F');tongue=helper.material('comic-tongue','C77670');teeth=helper.material('comic-teeth','EAE4CB')
blob('open-smiling-mouth',(0,-.118,1.663),(.035,.007,.018),mouth,.16)
blob('tongue-out',(.018,-.161,1.650),(.026,.030,.011),tongue,-.18)
blob('visible-upper-teeth',(-.003,-.140,1.669),(.022,.002,.003),teeth,.12)
rig['source']='User-supplied FBX modular body and GLB base head';rig['authoredFromScratch']=False;rig['visualStyle']='adapted-uploaded-model';rig['pendingReferenceDetails']='matching shirt tailoring; female source not supplied'
bpy.data.orphans_purge(do_recursive=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/('public/models/uploaded-male-adapted.blend' if '--preview-only' in sys.argv else 'public/models/detainee-man.blend')))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in rig.children:
 if obj.type=='MESH':obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/('public/models/uploaded-male-adapted.glb' if '--preview-only' in sys.argv else 'src/assets/detainee-man.glb')),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_extras=True,export_copyright='Head base mesh by LucaDrech, CC BY 4.0; modified for this game')
print('EXPORTED uploaded model',len(rig.data.bones),'bones')
