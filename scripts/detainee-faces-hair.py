"""Reference-specific face sculpt and fitted hairstyles for the supplied Universal rig.
Coordinates remain in the source bind pose. Every accessory uses the original head joint.
"""
import bpy, bmesh, math
from mathutils import Vector
TAU=math.tau

def smooth(obj):
 for face in obj.data.polygons: face.use_smooth=True
 return obj

def skin_object(obj,rig,bone='head'):
 obj.parent=rig
 obj.vertex_groups.clear()
 group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 obj.modifiers.clear();mod=obj.modifiers.new('Original source head attachment','ARMATURE');mod.object=rig
 return smooth(obj)

def solid(obj,thickness=.003):
 bpy.context.view_layer.objects.active=obj
 mod=obj.modifiers.new('Closed hair surface','SOLIDIFY');mod.thickness=thickness;mod.offset=0
 while obj.modifiers.find(mod.name)>0: bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name)
 return obj

def sphere(name,rig,centre,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=centre)
 obj=bpy.context.object;obj.name=name
 for v in obj.data.vertices: v.co.x*=size[0];v.co.y*=size[1];v.co.z*=size[2]
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 obj.data.materials.append(mat)
 return skin_object(obj,rig)

def tube(name,rig,h,path,radii,mat,ellipse=1,n=14):
 s=h.Surface(name,rig,[mat]);rings=[]
 for k,p in enumerate(path):
  p=Vector(p);tangent=Vector(path[min(k+1,len(path)-1)])-Vector(path[max(0,k-1)])
  tangent.normalize();axis=tangent.cross(Vector((0,0,1)))
  if axis.length<.1:axis=tangent.cross(Vector((0,1,0)))
  axis.normalize();other=tangent.cross(axis).normalized();r=radii[k]
  rings.append([s.vertex(p+r*math.cos(TAU*i/n)*axis+r*ellipse*math.sin(TAU*i/n)*other,{'head':1}) for i in range(n)])
 s.face(tuple(reversed(rings[0])))
 for a,b in zip(rings,rings[1:]):s.strip(a,b)
 s.face(rings[-1]);return smooth(s.object())

def female_hair(rig,h,mat,zshift,xscale):
 from mathutils.bvhtree import BVHTree
 # Fit the actual front curtain to this build's continuous source blouse,
 # keeping it outside the shirt rather than allowing visible red cutout tips.
 blouse=next((obj for obj in rig.children if obj.type=='MESH' and obj.name=='alice-continuous-source-denim-shirt'),None)
 tree=None
 if blouse:
  transform=rig.matrix_world.inverted()@blouse.matrix_world
  tree=BVHTree.FromPolygons([transform@v.co for v in blouse.data.vertices],[list(f.vertices) for f in blouse.data.polygons])
 def front_clearance(x,y,z,c):
  if tree is None or c<=0 or z>=1.70:return y
  hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
  if hit[0] is None:return y
  # The six-centimetre transition avoids a bend line at the top of the fit.
  blend=max(0,min(1,(1.70-z)/.060));blend=blend*blend*(3-2*blend)
  target=min(y,hit[0].y-.022)
  return y+(target-y)*blend
 # The fringe and crown share the same surface. A separate rectangular fringe
 # made a visor edge and an intersecting seam when viewed from above or the side.
 s=h.Surface('reference-alice-continuous-straight-hair',rig,[mat]);n=128;cap=[]
 profiles=[(1.822,.125,.160),(1.850,.128,.160),(1.880,.119,.146),(1.906,.096,.122),(1.928,.062,.085),(1.941,.016,.029)]
 for z,rx,ry in profiles:
  ring=[]
  for i in range(n):
   a=TAU*i/n;channel=.00065*math.cos(a*32)
   edge=.003*abs(math.sin(a))**4 if z==profiles[0][0] else 0
   ring.append(s.vertex(((rx+channel)*xscale*math.sin(a),.018-(ry+channel)*math.cos(a),z+zshift+edge),{'head':1}))
  cap.append(ring)
 for aa,bb in zip(cap,cap[1:]):s.strip(aa,bb)
 s.face(cap[-1])
 # Blunt horizontal bangs are the exposed front edge of the crown. The side and
 # back rows continue into the shoulder curtain with no duplicate scalp panels.
 start=20;end=108;last=cap[0][start:end+1]
 for j in range(1,33):
  t=j/32;z=1.822-.392*t;rx=(.125+.065*t*t)*xscale
  front=.160+.155*t*t;back=.160+.049*t*t;row=[]
  for i in range(start,end+1):
   a=TAU*i/n;c=math.cos(a);channel=.0009*math.cos(a*32)*(1-.25*t)
   depth=front if c>0 else back
   y=.018-(depth+channel)*math.copysign(abs(c)**(.95-.28*t),c)
   zz=z+zshift+.010*math.cos(a*5)*t**6
   x=(rx+channel)*math.sin(a);y=front_clearance(x,y,zz,c)
   blend=max(0,min(.68,(1.72-z)/.25*.68));w={'head':1-blend,'spine_03':blend}
   row.append(s.vertex((x,y,zz),w))
  for i in range(len(last)-1):s.face((last[i],last[i+1],row[i+1],row[i]))
  last=row
 obj=solid(smooth(s.object()),.004)
 return (obj,)

def male_hair(rig,h,mat,zshift,xscale,main=None):
 from mathutils.bvhtree import BVHTree
 main=main or next(obj for obj in rig.children if obj.type=='MESH' and 'continuous-body' in obj.name)
 head_tree=BVHTree.FromPolygons([v.co for v in main.data.vertices],[list(face.vertices) for face in main.data.polygons])
 def hair_lock(name,path,radii):
  # Carry the previous frame along the curve. Switching between world-Z and
  # world-Y frames creates a 90-degree roll and folded elliptical sections.
  surface=h.Surface(name,rig,[mat]);loops=[];previous=None
  for k,centre in enumerate(path):
   tangent=Vector(path[min(k+1,len(path)-1)])-Vector(path[max(0,k-1)]);tangent.normalize()
   axis=(previous-tangent*previous.dot(tangent)) if previous is not None else Vector((0,1,0))-tangent*tangent.y
   if axis.length<1e-5:axis=Vector((1,0,0))-tangent*tangent.x
   axis.normalize();previous=axis.copy();other=tangent.cross(axis).normalized();radius=radii[k]
   loops.append([surface.vertex(Vector(centre)+radius*math.cos(TAU*i/18)*axis+radius*.62*math.sin(TAU*i/18)*other,{'head':1}) for i in range(18)])
  surface.face(tuple(reversed(loops[0])))
  for aa,bb in zip(loops,loops[1:]):surface.strip(aa,bb)
  surface.face(loops[-1]);return smooth(surface.object())
 before=set(bpy.data.objects)
 s=h.Surface('reference-man-fitted-hair-cap',rig,[mat]);rings=[]
 profiles=[(1.797,.111,.164),(1.838,.123,.164),(1.873,.114,.134),(1.900,.093,.112),(1.923,.050,.069),(1.933,.004,.005)]
 for level,(z,rx,ry) in enumerate(profiles):
  ring=[]
  for i in range(96):
   a=TAU*i/96;c=math.cos(a);front=max(0,c)**4
   # Higher forehead edge with a modest widow's peak; sides stop at ear top.
   height=z+(.036*front if z<1.81 else 0)
   if z<1.81:
    # Forelocks are sculpted into the continuous cap edge; descending closed
    # cones show dark underside discs in this game's overhead lighting.
    fringe=.018*math.exp(-(math.sin(a)/.18)**2)+.012*math.exp(-((math.sin(a)-.36)/.15)**2)+.012*math.exp(-((math.sin(a)+.36)/.15)**2)
    height-=fringe*max(0,c)**8
   groove=.00065*math.cos(a*22)
   point=Vector(((rx+groove)*xscale*math.sin(a),.020-(ry+groove)*c,height+zshift))
   # The lower crown follows the actual deformed source skull. Fixed ellipse
   # depths left a visible floating helmet brim, especially over the forehead.
   origin=Vector((0,.020,point.z));direction=Vector((math.sin(a),-c,0))
   hit=head_tree.ray_cast(origin,direction,.5)
   if hit[0] is not None:
    fit=1.0 if level<2 else .72 if level==2 else .22 if level==3 else 0.0
    target=hit[0]+direction*(.008+groove)
    point=point.lerp(target,fit)
   ring.append(s.vertex(point,{'head':1}))
  rings.append(ring)
 for a,b in zip(rings,rings[1:]):s.strip(a,b)
 # A filled scalp volume is essential: a thin Solidify shell leaves a hollow
 # interior, so deep lock roots retain exposed flat end caps after voxel union.
 # Close the entire dome beneath the roots before combining the solid locks.
 inner=[]
 for index in rings[0]:
  point=Vector(s.vertices[index]);origin=Vector((0,.020,point.z));point=origin+(point-origin)*.83;point.z-=.012
  inner.append(s.vertex(point,{'head':1}))
 s.strip(inner,rings[0]);s.face(tuple(reversed(inner)));s.face(rings[-1]);cap=smooth(s.object())
 # Voluminous swept clumps have rounded roots and pointed ends. Their bases
 # overlap the cap inside it, so no exposed seams appear from side/back views.
 # Keep upward crown locks. Lateral descending cones expose large circular
 # undersides from the opposite side and are replaced by the fitted crown.
 locks=[
  ((-.050,-.070,1.900),(-.018,-.095,1.966),(.005,-.060,2.008),.040),
  ((-.018,-.045,1.917),(.020,-.072,1.971),(.076,-.082,1.988),.043),
  ((.046,-.031,1.904),(.083,-.065,1.954),(.120,-.063,1.976),.039),
  ((.040,.089,1.895),(.069,.130,1.944),(.115,.148,1.969),.038),
  ((-.043,.096,1.895),(-.052,.137,1.944),(-.106,.163,1.969),.039),
  ((.005,.052,1.923),(.018,.087,1.977),(.067,.120,1.996),.041),
  ((-.067,.049,1.902),(-.088,.087,1.955),(-.133,.129,1.977),.035)]
 for i,(a,b,c,r) in enumerate(locks):
  a=(a[0],a[1],a[2]-.027)
  path=[];radii=[]
  for j in range(17):
   t=j/16;p=Vector(a)*(1-t)**2+Vector(b)*2*t*(1-t)+Vector(c)*t*t;p.x*=xscale*.82;p.z=1.920+(p.z-1.920)*.82+zshift
   path.append(tuple(p));radii.append(max(.0008,r*(1-t)**.65*(.72+.28*math.sin(math.pi*t))))
  hair_lock('reference-man-swept-lock-'+str(i),path,radii)
 # Join and remesh the overlapping roots so the silhouette is a single haircut,
 # without the dark circular end caps of separately attached conical locks.
 parts=[o for o in set(bpy.data.objects)-before if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for obj in parts:
  obj.modifiers.clear()
  bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
  if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
  bm.to_mesh(obj.data);bm.free();obj.select_set(True)
 bpy.context.view_layer.objects.active=cap;bpy.ops.object.join();cap=bpy.context.object
 mod=cap.modifiers.new('Continuous swept hair roots','REMESH');mod.mode='VOXEL';mod.voxel_size=.0022;mod.use_smooth_shade=True
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=cap.modifiers.new('Rounded hair clumps','SMOOTH');mod.factor=.4;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=cap.modifiers.new('Game hair topology','DECIMATE');mod.ratio=.45;bpy.ops.object.modifier_apply(modifier=mod.name)
 bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 assert not any(edge.is_boundary for edge in bm.edges),'Haircut union has an open boundary'
 bm.to_mesh(cap.data);bm.free();cap['closedSolidScalpBeforeUnion']=True
 skin_object(cap,rig);return cap

def open_comic_mouth(rig,main,h,skin,zcentre):
 # Fit the opening and its cavity to the original face surface. A fixed Y plane
 # left the first mouth sticking out as a dark oval plate when seen from the side.
 from mathutils.bvhtree import BVHTree
 tree=BVHTree.FromPolygons([v.co for v in main.data.vertices],[list(p.vertices) for p in main.data.polygons])
 def front(x,z):
  hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
  return hit[0].y if hit[0] is not None else -.12
 rx=.067;rz=.020
 def centre(x):return zcentre+.10*x+.006*(x/rx)**2
 bm=bmesh.new();bm.from_mesh(main.data)
 def inside(p):return (p.x/.078)**2+((p.z-centre(p.x))/.024)**2
 drop=[f for f in bm.faces if f.calc_center_median().y<-.045 and inside(f.calc_center_median())<1.0]
 bmesh.ops.delete(bm,geom=drop,context='FACES')
 edgeverts=set()
 for e in bm.edges:
  if e.is_boundary and all(v.co.y<-.044 and abs(v.co.x)<.091 and abs(v.co.z-zcentre)<.046 for v in e.verts):edgeverts.update(e.verts)
 for v in edgeverts:
  a=math.atan2((v.co.z-centre(v.co.x))/rz,v.co.x/rx)
  x=rx*math.cos(a);z=centre(x)+rz*math.sin(a)
  v.co=Vector((x,front(x,z),z))
 bm.normal_update();bm.to_mesh(main.data);bm.free();main.data.update()
 mouthmat=h.material('reference-open-mouth-cavity','3D1E19');lipmat=h.material('reference-man-natural-lip','AA704B');pink=h.material('reference-man-comic-tongue','CF8073');teeth=h.material('reference-man-upper-teeth','EEE9D9')
 surface=h.Surface('reference-man-recessed-mouth-interior',rig,[mouthmat]);rings=[]
 for depth,amount in [(.002,1),(.013,.88),(.042,.30)]:
  ring=[]
  for i in range(96):
   a=TAU*i/96;x=rx*amount*math.cos(a);z=centre(x)+rz*amount*math.sin(a)
   ring.append(surface.vertex((x,front(x,z)+depth,z),{'head':1}))
  rings.append(ring)
 for aa,bb in zip(rings,rings[1:]):surface.strip(aa,bb)
 surface.face(rings[-1]);smooth(surface.object())
 path=[]
 for i in range(97):
  a=TAU*i/96;x=rx*math.cos(a);z=centre(x)+rz*math.sin(a)
  path.append((x,front(x,z)-.0008,z))
 tube('reference-man-integrated-lip-edge',rig,h,path,[.0012]*len(path),lipmat,1,10)
 surface=h.Surface('reference-man-upper-tooth-row',rig,[teeth]);aa=[];bb=[]
 for i in range(33):
  x=-rx*.80+rx*1.60*i/32;top=centre(x)+rz*math.sqrt(max(0,1-(x/rx)**2))-.002
  y=front(x,top)+.004
  aa.append(surface.vertex((x,y,top),{'head':1}));bb.append(surface.vertex((x,y,top-.005),{'head':1}))
 for i in range(32):surface.face((aa[i],aa[i+1],bb[i+1],bb[i]))
 solid(smooth(surface.object()),.0015)
 mean=front(.02,zcentre)
 path=[];radii=[]
 for i in range(25):
  t=i/24;p=Vector((.012,mean+.009,zcentre-.004))*(1-t)**2+Vector((.047,mean-.060,zcentre-.002))*2*t*(1-t)+Vector((.082,mean-.078,zcentre-.030))*t*t
  path.append(tuple(p));r=.010+.018*math.sin(math.pi*t/2)
  if t>.78:r*=math.sqrt(max(.0001,1-((t-.78)/.22)**2))
  radii.append(r)
 return tube('reference-man-attached-comic-tongue',rig,h,path,radii,pink,.43,24)

def improve_faces_hair(rig,main,h,materials,woman):
 kind='woman' if woman else 'man';skin=materials.get('skin') or main.data.materials[0];hair=materials.get('hair') or bpy.data.materials.get('universal-red-hair' if woman else 'universal-brown-hair')
 headgroup=main.vertex_groups.get('head');neckgroup=main.vertex_groups.get('neck');head_index=headgroup.index if headgroup else -1;neck_index=neckgroup.index if neckgroup else -1
 eyes=next((o for o in rig.children if o.type=='MESH' and o.name=='universal-'+kind+'-eyes'),None)
 ez=sum(v.co.z for v in eyes.data.vertices)/len(eyes.data.vertices) if eyes else (1.778 if woman else 1.788)
 original_eye=ez;xscale=1.23 if woman else 1.29;yscale=1.055;zscale=1.0;eyescale=1.12 if woman else 1.42;eye_vertical_scale=1.22 if woman else 1.70
 mouth=ez-(.086 if woman else .088)
 def transformed(p,amount=1,feature=False):
  x,y,z=p;x*=1+(xscale-1)*amount;y*=1+(yscale-1)*amount
  # Cheeks and jaw grow as a smooth continuation of the original face topology.
  if not feature and y<-.015:
   cheek=math.exp(-((abs(x)-.064)/.049)**2-((z-(ez-.050))/.046)**2)*amount
   x+=math.copysign(.008*cheek,x);y-=.007*cheek
   jaw=math.exp(-((z-(ez-.090))/.038)**2)*amount;x*=1+.05*jaw
   # Soften the long realistic pointed nose into a short rounded cartoon nose.
   nose=math.exp(-(x/.028)**4-((z-(ez-.045))/.021)**4)*amount
   if not woman and y<-.075:x*=1+.26*nose
   if y<-.128:y+=min(.006,(-.128-y)*.20)*nose if woman else -.005*nose
   # Enlarge the source eye openings and move the original eyelids with them.
   for sign in [-1,1]:
    cx=sign*.045*xscale;dz=z-ez;dx=x-cx;r2=(dx/.032)**2+(dz/.029)**2
    f=(eyescale-1)*math.exp(-r2**2)*amount
    x+=dx*f;z+=dz*(eye_vertical_scale-1)*math.exp(-r2**2)*amount
   if woman:
    lip=math.exp(-(x/.052)**6-((z-mouth)/.020)**6)*amount
    z=mouth+(z-mouth)*(1-.49*lip)
    # Move the source lip corners downward with a smooth neighbourhood mask.
    # Preserve the actual lip topology; a raised centre and lowered corners
    # produce the reference's irritated frown rather than an accidental smile.
    frown_mask=math.exp(-(x/.080)**6-((z-mouth)/.026)**4)*amount
    corner=min(1,abs(x)/.060)**2
    frown=.003*math.exp(-(x/.026)**4)-.008*corner
    z+=frown*frown_mask
  return Vector((x,y,z))
 for v in main.data.vertices:
  w={g.group:g.weight for g in v.groups};amount=w.get(head_index,0)+w.get(neck_index,0)*max(0,min(1,(v.co.z-(ez-.160))/.045))
  if amount>.01:v.co=transformed(v.co,min(1,amount))
 for obj in list(rig.children):
  if obj.type!='MESH':continue
  if obj.name=='universal-'+kind+'-hair':bpy.data.objects.remove(obj,do_unlink=True);continue
  if 'brows' in obj.name:
   for v in obj.data.vertices:
    v.co=transformed(v.co,1,True)
    if woman:v.co.z+=(abs(v.co.x)-.044)*.09
    else:v.co.z+=(.004 if v.co.x>0 else -.001)
   smooth(obj)
  if obj==eyes:
   for side in [-1,1]:
    vertices=[v for v in obj.data.vertices if (v.co.x<0)==(side<0)];c=sum((v.co for v in vertices),Vector())/len(vertices)
    for v in vertices:
     d=v.co-c;q=c+Vector((d.x*eyescale,d.y*(1.30 if not woman else 1.0),d.z*eye_vertical_scale))
     q=transformed(q,1,True)
     if not woman:q.y-=.003
     v.co=q
   # Synchronize blink shape coordinates with the changed original eye surface.
   if obj.data.shape_keys:
    basis=obj.data.shape_keys.key_blocks.get('Basis');blink=obj.data.shape_keys.key_blocks.get('Blink')
    for v in obj.data.vertices:
     if basis:basis.data[v.index].co=v.co
     if blink:blink.data[v.index].co=Vector((v.co.x,v.co.y,ez+(v.co.z-ez)*.04))
   smooth(obj)
 if woman:female_hair(rig,h,hair,ez-1.7773,xscale)
 else:
  male_hair(rig,h,hair,ez-1.7874,xscale,main)
  open_comic_mouth(rig,main,h,skin,mouth)
 main.data.update();rig['referenceHeadSculpt']='rounded fuller cheeks, fitted eyelids, blunt fringe' if woman else 'rounded full face, enlarged source eyes, real open mouth and attached tongue'
