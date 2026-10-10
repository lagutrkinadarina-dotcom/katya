"""Source-derived, smooth tailored shirt for the seated Universal male.

The garment retains the uploaded body's topology and deform weights. Sleeves
are reshaped around its actual arm axes, rather than inflating source muscles.
Only the garment is replaced; skeleton, fingers and arm placement are retained.
"""
import bpy
import bmesh
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _smoothstep(a, b, x):
    t=max(0.,min(1.,(x-a)/(b-a)))
    return t*t*(3-2*t)


def _apply_before_armature(obj, modifier):
    bpy.context.view_layer.objects.active=obj
    while obj.modifiers.find(modifier.name)>0:
        bpy.ops.object.modifier_move_up(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def _finish(obj, thickness=0):
    for p in obj.data.polygons:p.use_smooth=True
    if thickness:
        solid=obj.modifiers.new('Woven cloth thickness','SOLIDIFY')
        solid.thickness=thickness;solid.offset=0
        _apply_before_armature(obj,solid)


def _plaid(obj, mat):
    """Small, pale checks with circumferential sleeve UVs, not flat stretch."""
    image=bpy.data.images.get('reference-male-fine-plaid')
    if image is None:
        image=bpy.data.images.new('reference-male-fine-plaid',width=256,height=256)
        pixels=[]
        for iy in range(256):
            for ix in range(256):
                x=ix%128;y=iy%128
                broad=(29<=x<=57)+(29<=y<=57)
                fine=(x in [23,25,62,64,113,115])+(y in [23,25,62,64,113,115])
                c=(.907,.927,.901) if broad==0 else (.821,.867,.861) if broad==1 else (.738,.804,.816)
                if fine:c=tuple(v-.045 for v in c)
                grain=.003*math.sin(ix*1.97+iy*.17)
                pixels.extend((*[v+grain for v in c],1))
        image.pixels=pixels;image.pack()
    mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.name='Fine source-derived shirt checks';tex.image=image
    links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    nodes.get('Principled BSDF').inputs['Roughness'].default_value=.83
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Tailored checks')
    for p in obj.data.polygons:
        c=sum((obj.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        sleeve=abs(c.x)>.27
        for li in p.loop_indices:
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            if sleeve:
                angle=math.atan2(v.z-1.521,v.y-.073)
                uv.data[li].uv=(abs(v.x)/.235,angle*.075/.235)
            else:
                angle=math.atan2(v.x,-v.y)
                uv.data[li].uv=(angle*.215/.235,v.z/.235)


def improve_male(rig, main, h, materials):
    # Imported original bodies, joints and hands remain intact. Remove only
    # the earlier accessories and source-derived garment being replaced.
    for obj in list(rig.children):
        if obj.type!='MESH':continue
        if any(obj.name.startswith(prefix) for prefix in (
            'universal-man-tailored-shirt','universal-man-rolled-cuffs',
            'universal-man-breast-pocket','universal-shirt-collar',
            'universal-shirt-button','reference-male-continuous-shirt',
            'reference-male-single-rolled-cuffs','reference-male-centre-placket',
            'reference-male-connected-collar','reference-male-surface-fitted-collar',
            'reference-male-shirt-breast-pocket','reference-male-shirt-button')):
            bpy.data.objects.remove(obj,do_unlink=True)
    shirt=materials.get('shirt') if isinstance(materials,dict) else None
    shirt=shirt or bpy.data.materials.get('universal-plaid')
    assert shirt is not None,'Male shirt material missing'
    cuffmat=h.material('reference-male-rolled-cotton','D9E1D9')
    buttonmat=h.material('reference-male-small-buttons','E7E2CF')
    seams=h.material('reference-male-shirt-seams','CFD9D2')
    cloth=main.copy();cloth.data=main.data.copy()
    bpy.context.collection.objects.link(cloth);cloth.name='reference-male-continuous-shirt'
    bm=bmesh.new();bm.from_mesh(cloth.data);deform=bm.verts.layers.deform.active
    def vertexweights(v):
        return {cloth.vertex_groups[g].name:a for g,a in v[deform].items() if a>1e-7}
    def armweight(v):
        return sum(a for n,a in vertexweights(v).items() if n.startswith(('upper_arm','upperarm_twist','forearm','lowerarm_twist')))
    drop=[]
    for f in bm.faces:
        c=f.calc_center_median()
        neck=sum(sum(a for n,a in vertexweights(v).items() if n in ['neck','head']) for v in f.verts)/len(f.verts)
        arm=sum(armweight(v) for v in f.verts)/len(f.verts)
        if c.z<1.065 or (neck>.45 and arm<.20) or abs(c.x)>.605:
            drop.append(f)
    bmesh.ops.delete(bm,geom=drop,context='FACES')
    # Exact wrist-side clipping creates a single clean sleeve boundary,
    # independently of the uploaded mesh's material tessellation.
    for sign in [-1,1]:
        elbow=rig.data.bones['forearm.'+('L' if sign<0 else 'R')].head_local
        cut=abs(elbow.x)+.047
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,
            plane_co=(sign*cut,0,0),plane_no=(sign,0,0),clear_outer=True,clear_inner=False)
    # Remove unrelated source surfaces such as teeth, sole strips, neck and
    # isolated face components. A shirt is the one connected torso component.
    bm.verts.ensure_lookup_table()
    visited=set();components=[]
    for v in bm.verts:
        if v in visited or not v.link_faces:continue
        stack=[v];part=set()
        while stack:
            cur=stack.pop()
            if cur in visited:continue
            visited.add(cur);part.add(cur)
            stack.extend(e.other_vert(cur) for e in cur.link_edges if e.other_vert(cur) not in visited)
        components.append(part)
    keep=max(components,key=len)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
    # Smooth anatomical muscle grooves first, then normalize the sleeve
    # cross sections around the source joints. The axilla still shares faces.
    for _ in range(8):
        bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],factor=.42,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    for v in bm.verts:
        x=abs(v.co.x);sign=-1 if v.co.x<0 else 1;side='L' if sign<0 else 'R'
        upper=rig.data.bones['upper_arm.'+side];lower=rig.data.bones['forearm.'+side]
        start=upper.head_local;end=lower.head_local
        t=max(0,min(1,(x-abs(start.x))/(abs(end.x)-abs(start.x))))
        cy=start.y+(end.y-start.y)*t;cz=start.z+(end.z-start.z)*t
        sleeveblend=_smoothstep(.205,.310,x)
        if sleeveblend:
            dy=v.co.y-cy;dz=v.co.z-cz
            angle=math.atan2(dz,dy)
            # Straight relaxed cotton, not two ellipsoid muscle shells.
            ry=.099-.025*t;rz=.091-.020*t
            if x>abs(end.x):ry-=.003;rz-=.002
            target=Vector((v.co.x,cy+ry*math.cos(angle),cz+rz*math.sin(angle)))
            v.co=v.co.lerp(target,sleeveblend)
        # A generous shirt shell over the shaped source body, with no
        # inflated rear shoulder/chest ridge and no abrupt abdominal rings.
        if x<.27:
            v.co.y-=.006 if v.co.y<0 else 0
        if v.is_boundary and v.co.z<1.125 and x<.30:v.co.z=1.073
    bm.normal_update()
    for v in bm.verts:v.co+=v.normal*.009
    # Capture the same precise edge for the turned cuff so there can be no
    # gap or overlapping disconnected sleeve bulb when the elbow bends.
    s=h.Surface('reference-male-single-rolled-cuffs',rig,[cuffmat])
    for edge in bm.edges:
        if not edge.is_boundary or min(abs(v.co.x) for v in edge.verts)<.46:continue
        outer=[];inner=[]
        for v in edge.verts:
            w=vertexweights(v);total=sum(w.values());w={n:a/total for n,a in w.items()}
            offset=Vector((-math.copysign(.026,v.co.x),0,0))
            outer.append(s.vertex(v.co+v.normal*.003,w))
            inner.append(s.vertex(v.co+offset+v.normal*.004,w))
        s.face((outer[0],outer[1],inner[1],inner[0]))
    cuff=s.object();welded=bmesh.new();welded.from_mesh(cuff.data);bmesh.ops.remove_doubles(welded,verts=list(welded.verts),dist=1e-6);welded.normal_update();welded.to_mesh(cuff.data);welded.free();_finish(cuff,.002)
    bm.to_mesh(cloth.data);bm.free();cloth.data.materials.clear();cloth.data.materials.append(shirt)
    for p in cloth.data.polygons:p.material_index=0;p.use_smooth=True
    _finish(cloth,.003);_plaid(cloth,shirt)
    tree=BVHTree.FromPolygons([v.co for v in cloth.data.vertices],[list(p.vertices) for p in cloth.data.polygons])
    def front(x,z):
        hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        return hit[0].y-.003 if hit[0] is not None else -.1
    def weights(x,z):
        hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        if hit[0] is None:return {'spine_03':1}
        p=cloth.data.polygons[hit[2]];values={}
        for i in p.vertices:
            for g in cloth.data.vertices[i].groups:
                name=cloth.vertex_groups[g.group].name
                values[name]=values.get(name,0)+g.weight/len(p.vertices)
        total=sum(values.values());return {n:a/total for n,a in values.items()}
    # Flat fabric centre placket follows the actual surface rather than a
    # hard-coded front plane that can end up embedded in the abdomen.
    s=h.Surface('reference-male-centre-placket',rig,[shirt]);last=None
    for i in range(21):
        z=1.090+i*(1.565-1.090)/20
        row=[s.vertex((x,front(x,z)-.002,z),weights(x,z)) for x in [-.012,.012]]
        if last:s.face((last[0],last[1],row[1],row[0]))
        last=row
    placket=s.object();_finish(placket,.001);_plaid(placket,shirt)
    # Every collar vertex rests on the actual curved shirt and copies the
    # same skin weights. Flat four-corner leaves used to become unsupported
    # throat wedges when the seated torso bent. Keep the fold short and open.
    from mathutils.kdtree import KDTree
    frontverts=[v for v in cloth.data.vertices if v.co.y<.035 and abs(v.co.x)<.20 and 1.48<v.co.z<1.63]
    nearest=KDTree(len(frontverts))
    for i,v in enumerate(frontverts):nearest.insert((v.co.x,v.co.z,0),i)
    nearest.balance()
    def collar_sample(x,z):
        hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        if hit[0] is not None and hit[0].y<.035:
            return hit[0]+hit[1]*.0022,weights(x,z)
        # At the open neckline the forward ray reaches the back of the shirt;
        # clamp to the closest front edge instead of building through the neck.
        _,index,_=nearest.find((x,z,0));v=frontverts[index]
        w={cloth.vertex_groups[g.group].name:g.weight for g in v.groups}
        total=sum(w.values());w={n:a/total for n,a in w.items()}
        return v.co+v.normal*.0022,w
    s=h.Surface('reference-male-surface-fitted-collar',rig,[shirt])
    for sign in [-1,1]:
        rows=[]
        for j in range(9):
            t=j/8;row=[]
            for i in range(13):
                u=i/12
                x=sign*((.026*(1-u)+.104*u)*(1-t)+(.024*(1-u)+.079*u)*t)
                z=(1.578*(1-u)+1.569*u)*(1-t)+(1.548*(1-u)+1.524*u)*t
                co,w=collar_sample(x,z)
                row.append(s.vertex(co,w))
            rows.append(row)
        for a,b in zip(rows,rows[1:]):
            for i in range(len(a)-1):s.face((a[i],a[i+1],b[i+1],b[i]))
    collar=s.object();_finish(collar,.0015);_plaid(collar,shirt)
    # Small neutral buttons extend naturally over the round abdomen.
    for i in range(8):
        z=1.561-i*.060;y=front(0,z)-.006
        s=h.Surface('reference-male-shirt-button-%02d'%i,rig,[buttonmat])
        ids=[s.vertex((.0045*math.cos(math.tau*j/16),y,z+.0045*math.sin(math.tau*j/16)),weights(0,z)) for j in range(16)]
        s.face(ids);obj=s.object();_finish(obj,.0012)
    # Pocket sits on the same shell and deforms with the same source weights.
    points=[(.087,1.464),(.170,1.464),(.170,1.400),(.128,1.386),(.087,1.400)]
    s=h.Surface('reference-male-shirt-breast-pocket',rig,[shirt])
    s.face([s.vertex((x,front(x,z)-.002,z),weights(x,z)) for x,z in points])
    pocket=s.object();_finish(pocket,.0015);_plaid(pocket,shirt)
    rig['maleGarment']='one source-derived shirt surface, normalized sleeves and source skin weights'
    print('MALE TAILORING',len(cloth.data.vertices),'shirt vertices; one connected torso/sleeve shell',flush=True)
    return cloth
