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
 """One closed, short haircut fitted to the original deformed source skull."""
 from mathutils.bvhtree import BVHTree
 main=main or next(obj for obj in rig.children if obj.type=='MESH' and 'continuous-body' in obj.name)
 head_tree=BVHTree.FromPolygons([v.co for v in main.data.vertices],[list(face.vertices) for face in main.data.polygons])
 crown_z=max(v.co.z for v in main.data.vertices)
 crown_vertices=[v.co for v in main.data.vertices if v.co.z>crown_z-.0025]
 crown_xy=sum(crown_vertices,Vector())/len(crown_vertices)
 surface=h.Surface('reference-man-fitted-hair-cap',rig,[mat]);rings=[];n=128;rows=28
 for row in range(rows):
  t=row/(rows-1);ring=[]
  for i in range(n):
   a=TAU*i/n;c=math.cos(a)
   # A higher forehead line, short temples and a neat lower nape. The edge is
   # part of the same scalp surface, so there are no cones or floating forelocks.
   edge=crown_z-.094+.016*max(0,c)**3-.030*max(0,-c)**2
   edge+=.0018*math.sin(3*a)+.0010*math.cos(7*a)
   z=edge*(1-t)+(crown_z-.002)*t
   upper=max(0,min(1,(z-(crown_z-.030))/.028));upper=upper*upper*(3-2*upper)
   origin=Vector((crown_xy.x*upper,.020*(1-upper)+crown_xy.y*upper,z))
   direction=Vector((math.sin(a),-c,0));hit=head_tree.ray_cast(origin,direction,.5)
   # The source head is a convex continuous scalp here. Keep a conservative
   # fallback only for the few rays that coincide with a source triangle edge.
   if hit[0] is not None:point=hit[0].copy()
   else:
    radius=max(.008,.132*math.sqrt(max(.002,1-((z-(crown_z-.115))/.118)**2)))
    point=origin+direction*radius
   # At most millimetres of combed relief, never detached spikes. Thickness
   # grows gently over the crown while remaining close to temples and forehead.
   comb=.00055*math.cos(18*(a+.32*t))*(.30+.70*t)
   thickness=.0055+.0025*math.sin(math.pi*t/2)+comb
   point+=direction*thickness
   sweep=.0032*math.exp(-((point.x+.033)/.063)**2-((point.y+.036)/.080)**2)*t*t
   point.z+=sweep
   ring.append(surface.vertex(point,{'head':1}))
  rings.append(ring)
 for aa,bb in zip(rings,rings[1:]):surface.strip(aa,bb)
 pole=surface.vertex((crown_xy.x-.002,crown_xy.y-.001,crown_z+.012),{'head':1})
 for i in range(n):surface.face((rings[-1][i],rings[-1][(i+1)%n],pole))
 # Close beneath the visible hairline inside the skull. This is a filled scalp
 # volume, not a hollow helmet with an exposed horizontal brim.
 inner=[]
 for index in rings[0]:
  point=Vector(surface.vertices[index]);origin=Vector((0,.020,point.z))
  point=origin+(point-origin)*.84;point.z-=.009
  inner.append(surface.vertex(point,{'head':1}))
 surface.strip(inner,rings[0]);surface.face(tuple(reversed(inner)))
 cap=smooth(surface.object());bpy.context.view_layer.objects.active=cap
 mod=cap.modifiers.new('Soft short haircut surface','SMOOTH');mod.factor=.16;mod.iterations=2
 while cap.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name)
 bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 assert not any(edge.is_boundary for edge in bm.edges),'Short haircut has an open boundary'
 bm.to_mesh(cap.data);bm.free()
 cap['closedSolidScalpBeforeUnion']=True;cap['haircut']='short, close fitted, gently swept crown'
 skin_object(cap,rig);return cap

def closed_natural_mouth(rig,main,zcentre):
 # Retain the supplied face's actual lip topology. The exaggerated mouth used
 # to cut away those polygons and attach a cavity, tooth strip and tongue.
 # Sculpt a relaxed closed mouth into the continuous source face instead.
 head=main.vertex_groups['head'].index
 for vertex in main.data.vertices:
  x,y,z=vertex.co
  if y>=-.045:continue
  weight=sum(group.weight for group in vertex.groups if group.group==head)
  mask=math.exp(-(x/.060)**6-((z-zcentre)/.023)**4)*weight
  centre=zcentre+.0015*min(1,abs(x)/.060)**2
  target=centre+(z-zcentre)*.62
  vertex.co.z=z+(target-z)*mask
 main.data.update()
 rig['mouthStyle']='relaxed closed lips sculpted into original face'

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
  closed_natural_mouth(rig,main,mouth)
 main.data.update();rig['referenceHeadSculpt']='rounded fuller cheeks, fitted eyelids, blunt fringe' if woman else 'rounded full face, enlarged source eyes, natural closed mouth and short hair'
