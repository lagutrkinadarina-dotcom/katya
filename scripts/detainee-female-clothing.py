"""Reference-fitted Alice clothing on the uploaded Universal body and skeleton.
The skirt is authored in a seated pose, then inverse-bound to the existing joints:
its lap follows the thighs, rather than remaining a rigid pelvis-only ellipse.
"""
import math
import bpy,bmesh
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
TAU=math.tau

def improve_female(rig,main,h,materials):
    shirt=materials['shirt'];dress=materials['dress']
    keep={main}
    for obj in list(rig.children):
        if obj.type!='MESH' or obj is main:continue
        if any(token in obj.name for token in ('-hair','-eyes','-brows','-face','-teeth','-tongue','-mouth','-iris','-pupil','-eyelid')):continue
        bpy.data.objects.remove(obj,do_unlink=True)
    for polygon in main.data.polygons:
        if polygon.material_index!=3:polygon.material_index=0
    groups={g.index:g.name for g in main.vertex_groups}
    weights=[{groups[g.group]:g.weight for g in v.groups if g.weight>1e-7} for v in main.data.vertices]
    hip=rig.data.bones['hips'].head_local.copy()
    minhip=min(v.co.z for v,w in zip(main.data.vertices,weights) if w.get('hips',0)>=.4)
    rig['supportMinimumHipZ']=minhip
    seated=.4925+hip.z-minhip;shift=Vector((0,0,seated-hip.z))
    # Match the runtime two-bone solve, in Blender Z-up/front-negative-Y space.
    skin={name:Matrix.Translation(shift) for name in rig.data.bones.keys()}
    def two_bone(start,target,a,b,bend):
        direction=target-start;dist=min(direction.length,a+b-1e-6);axis=direction.normalized()
        pole=bend-axis*bend.dot(axis);pole.normalize()
        x=(a*a-b*b+dist*dist)/(2*dist);height=math.sqrt(max(0,a*a-x*x))
        return start+axis*x+pole*height,start+axis*dist
    for side in ['L','R']:
        a=rig.data.bones['thigh.'+side].head_local;b=rig.data.bones['shin.'+side].head_local;c=rig.data.bones['foot.'+side].head_local
        footmin=min(v.co.z for v,w in zip(main.data.vertices,weights) if w.get('foot.'+side,0)>.9999)
        ankle=c.z+.012-footmin;target=Vector((math.copysign(.125,a.x),-.48,ankle));start=a+shift
        knee,end=two_bone(start,target,(b-a).length,(c-b).length,Vector((0,-1,0)))
        for name,oldhead,oldend,newhead,newend in [('thigh.'+side,a,b,start,knee),('shin.'+side,b,c,knee,end)]:
            q=(oldend-oldhead).rotation_difference(newend-newhead)
            skin[name]=Matrix.Translation(newhead)@q.to_matrix().to_4x4()@Matrix.Translation(-oldhead)
        skin['foot.'+side]=Matrix.Translation(end-c)
        suffix=side.lower()
        for name in skin:
            if name.startswith('ball_') and name.endswith('_'+suffix):skin[name]=skin['foot.'+side]
    # The Universal source also weights its skin to thigh/calf twist children.
    # They inherit their parent's movement in the game. Treating them as rigid
    # pelvis skin here misclassified concealed thigh polygons as exposed skin.
    driven={'thigh.L','thigh.R','shin.L','shin.R','foot.L','foot.R'}
    for bone in sorted(rig.data.bones,key=lambda b:len(b.parent_recursive)):
        if bone.name in driven:continue
        if bone.parent and bone.parent.name in driven:
            skin[bone.name]=skin[bone.parent.name];driven.add(bone.name)
    def blended(w):
        m=Matrix(((0,0,0,0),(0,0,0,0),(0,0,0,0),(0,0,0,0)))
        for n,a in w.items():m+=skin.get(n,Matrix.Translation(shift))*a
        return m
    posed=[blended(w)@v.co for v,w in zip(main.data.vertices,weights)]
    # Torso shell: a soft, fitted shirt, independent of the source breast creases.
    # Profile depth is measured from the body, with a few millimetres of fabric ease.
    torsofaces=[]
    for p in main.data.polygons:
        ws={}
        for i in p.vertices:
            for n,a in weights[i].items():ws[n]=ws.get(n,0)+a/len(p.vertices)
        if sum(a for n,a in ws.items() if n.startswith(('upper_arm','forearm','hand','finger','thumb')))<.3:
            torsofaces.append(list(p.vertices))
    bodytree=BVHTree.FromPolygons([v.co for v in main.data.vertices],torsofaces)
    def torso_weight(z):
        a=max(0,min(1,(z-1.23)/.23));a=a*a*(3-2*a)
        return {'spine_02':1-a,'spine_03':a}
    def smooth_object(obj,sub=0,solid=.003):
        for p in obj.data.polygons:p.use_smooth=True
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        if sub:
            m=obj.modifiers.new('Soft garment curvature','SUBSURF');m.levels=sub
            while obj.modifiers.find(m.name)>0:bpy.ops.object.modifier_move_up(modifier=m.name)
            bpy.ops.object.modifier_apply(modifier=m.name)
        if solid:
            m=obj.modifiers.new('Actual woven fabric thickness','SOLIDIFY');m.thickness=solid;m.offset=0
            while obj.modifiers.find(m.name)>0:bpy.ops.object.modifier_move_up(modifier=m.name)
            bpy.ops.object.modifier_apply(modifier=m.name)
        return obj
    # More closely fitted than the previous loose cloak; side/back sections follow
    # the original torso hull instead of extrapolating the chest depth around it.
    profiles=[(1.190,.252,.177,.210,.018),(1.230,.239,.181,.183,.040),(1.300,.232,.203,.158,.070),(1.400,.244,.219,.177,.081),(1.480,.248,.209,.167,.075),(1.525,.231,.145,.123,.062),(1.565,.198,.100,.110,.047),(1.602,.073,.075,.080,.044)]
    def profile_at(z):
        for a,b in zip(profiles,profiles[1:]):
            if a[0]<=z<=b[0]:
                t=(z-a[0])/(b[0]-a[0]);return tuple(x+(y-x)*t for x,y in zip(a,b))
        return profiles[0] if z<profiles[0][0] else profiles[-1]
    # Copy the uploaded surface as one garment. The source's connected axilla
    # and shoulder faces are retained, so sleeves cannot overlap the torso as
    # independent round shoulder caps. Only neck, front opening and hems are cut.
    blouse=main.copy();blouse.data=main.data.copy()
    bpy.context.collection.objects.link(blouse);blouse.name='alice-continuous-source-denim-shirt'
    bm=bmesh.new();bm.from_mesh(blouse.data);deform=bm.verts.layers.deform.active
    def vertexweights(v):
        return {blouse.vertex_groups[g].name:a for g,a in v[deform].items() if a>1e-7}
    def armweight(v):
        return sum(a for n,a in vertexweights(v).items() if n.startswith(('upper_arm','upperarm_twist','forearm','lowerarm_twist')))
    def smoothstep(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    drop=[]
    for face in bm.faces:
        c=face.calc_center_median();arm=sum(armweight(v) for v in face.verts)/len(face.verts)
        neck=sum(sum(a for n,a in vertexweights(v).items() if n in ['neck','head']) for v in face.verts)/len(face.verts)
        _,rx,f,b,width=profile_at(c.z)
        opening=c.y<.012 and abs(c.x)<width and c.z>1.190 and arm<.2
        if c.z<1.150 or (neck>.40 and arm<.20) or abs(c.x)>.470 or opening:drop.append(face)
    bmesh.ops.delete(bm,geom=drop,context='FACES')
    # Exact cut loops provide short rolled sleeves and a level tied waist hem.
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,
        plane_co=(0,0,1.190),plane_no=(0,0,1),clear_inner=True)
    for sign in [-1,1]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-6,
            plane_co=(sign*.420,0,0),plane_no=(sign,0,0),clear_outer=True)
    # Discard the source's unrelated mouth/face components; the garment is the
    # largest single torso-and-arms component, not assembled clothing primitives.
    visited=set();components=[]
    for vertex in bm.verts:
        if vertex in visited or not vertex.link_faces:continue
        stack=[vertex];part=set()
        while stack:
            v=stack.pop()
            if v in visited:continue
            visited.add(v);part.add(v)
            stack.extend(e.other_vert(v) for e in v.link_edges if e.other_vert(v) not in visited)
        components.append(part)
    keep=max(components,key=len)
    assert any(v.co.x<-.39 for v in keep) and any(v.co.x>.39 for v in keep), 'Source shirt lost a connected sleeve'
    blouse['continuousTorsoSleeves']=True
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
    for _ in range(6):
        bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],factor=.30,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    for v in bm.verts:
        co=v.co.copy();x=abs(co.x);sign=-1 if co.x<0 else 1;side='L' if sign<0 else 'R'
        z,rx,front,back,width=profile_at(co.z)
        depth=front if co.y<0 else back
        angle=math.atan2(co.x/max(rx,.01),-co.y/max(depth,.01));c=math.cos(angle)
        target=Vector((rx*math.sin(angle),-math.copysign(depth*abs(c)**.65,c),co.z))
        aw=armweight(v)
        torso_amount=1-smoothstep(.20,.68,aw)
        v.co=co.lerp(target,torso_amount)
        upper=rig.data.bones['upper_arm.'+side].head_local;lower=rig.data.bones['forearm.'+side].head_local
        t=max(0,min(1,(x-abs(upper.x))/(abs(lower.x)-abs(upper.x))))
        cy=upper.y+(lower.y-upper.y)*t;cz=upper.z+(lower.z-upper.z)*t
        sleeve_amount=max(smoothstep(.125,.220,x),smoothstep(.30,.80,aw))*smoothstep(.02,.30,aw)
        if sleeve_amount:
            a=math.atan2(co.z-cz,co.y-cy)
            ry=.093-.016*t;rz=.084-.018*t
            sleeve=Vector((co.x,cy+ry*math.cos(a),cz+rz*math.sin(a)))
            v.co=v.co.lerp(sleeve,sleeve_amount)
        # A short sleeve ends before the elbow. Its cuff is carried by the
        # upper arm as one cloth ring, rather than retaining unequal source
        # muscle/twist influence around the circumference.
        if x>.350 and aw>.35:
            for group in list(v[deform].keys()):del v[deform][group]
            v[deform][blouse.vertex_groups['upper_arm.'+side].index]=1.0
        if v.is_boundary:
            neckline=co.z>1.535 and x<.180 and aw<.20 and co.y>-.100
            if neckline:
                # The previous radial torso profile widened the source neck
                # opening across the clavicles. Fit that actual boundary to the
                # uploaded neck surface instead, keeping a few mm of cloth ease.
                center=Vector((0,.045,1.595));direction=Vector((co.x,co.y-.045,0))
                if direction.length<1e-6:direction=Vector((sign,0,0))
                direction.normalize();hit=bodytree.ray_cast(center,direction)
                if hit[0] is not None and hit[3]<.180:
                    v.co=hit[0]+hit[1]*.006
                    values={}
                    indices=torsofaces[hit[2]]
                    for index in indices:
                        for name,value in weights[index].items():values[name]=values.get(name,0)+value/len(indices)
                    values=dict(sorted(values.items(),key=lambda item:item[1],reverse=True)[:4]);total=sum(values.values())
                    for group in list(v[deform].keys()):del v[deform][group]
                    for name,value in values.items():v[deform][blouse.vertex_groups[name].index]=value/total
                else:
                    # Retain the actual source boundary if the body ray misses;
                    # never invent a detached collar/neck plane in empty space.
                    v.co=co
            elif x<.18 and v.co.y<0 and 1.192<v.co.z<1.585:
                _,rx,front,back,width=profile_at(v.co.z)
                v.co.x=math.copysign(width,v.co.x)
                c=math.sqrt(max(0,1-(width/rx)**2));v.co.y=-front*c**.65
            if x<.30 and v.co.z<1.192:v.co.z=1.190
    # A final relaxation across the actual shared faces softens the sleeve root
    # without introducing separate caps or moving the hand/arm skeleton.
    for _ in range(8):
        bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary and .125<abs(v.co.x)<.350],factor=.26,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    bm.normal_update()
    for v in bm.verts:v.co+=v.normal*.005
    cuffmat=h.material('alice-denim-rolled-inner-cuff','7394AB')
    cuff_surface=h.Surface('alice-soft-turned-short-cuffs',rig,[cuffmat])
    for edge in bm.edges:
        if not edge.is_boundary or min(abs(v.co.x) for v in edge.verts)<.385:continue
        ids=[]
        for v in edge.verts:
            w=vertexweights(v);total=sum(w.values());w={n:a/total for n,a in w.items()}
            outer=cuff_surface.vertex(v.co+v.normal*.003,w)
            inner=cuff_surface.vertex(v.co+Vector((-math.copysign(.032,v.co.x),0,0))+v.normal*.004,w)
            ids.append((outer,inner))
        cuff_surface.face((ids[0][0],ids[1][0],ids[1][1],ids[0][1]))
    bm.to_mesh(blouse.data);bm.free();blouse.data.materials.clear();blouse.data.materials.append(shirt)
    for p in blouse.data.polygons:p.material_index=0
    smooth_object(blouse,0,.003)
    cuff=cuff_surface.object();bm=bmesh.new();bm.from_mesh(cuff.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.normal_update();bm.to_mesh(cuff.data);bm.free()
    smooth_object(cuff,0,.002)
    # Real lime bodice with a single dipped neckline, covered by open denim sides.
    s=h.Surface('alice-lime-dress-bodice',rig,[dress]);rings=[]
    for j in range(17):
        t=j/16;ring=[]
        for i in range(128):
            a=TAU*i/128;c=math.cos(a);z=1.150+(1.485-.077*max(c,0)**3-1.150)*t
            _,rx,f,b,_=profile_at(z);rx-=.008;depth=(f-.012) if c>0 else (b-.011)
            ring.append(s.vertex((rx*math.sin(a),-math.copysign(depth*abs(c)**.65,c),z),torso_weight(z)))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):s.strip(a,b)
    smooth_object(s.object(),1,.003)
    # Canonically seated dress surface. Its upper waist joins the bodice, its
    # back wraps the actual buttocks down to the bench, and front lies on the lap.
    # Inverse blend matrices bind each lap section to the nearest thigh, so the
    # surface is not a rigid bell/hoop attached to the pelvis.
    surface=h.Surface('alice-seated-thigh-draped-dress',rig,[dress]);rings=[]
    top=1.195+shift.z;fronthem=.625;backhem=.493;sidehem=.552
    for j in range(25):
        t=j/24;ring=[];ease=math.sin(t*math.pi/2)
        for i in range(160):
            a=TAU*i/160;c=math.cos(a);front=max(c,0);back=max(-c,0)
            rx=.248+.083*ease-.012*t*t;fdepth=.177+.330*ease;bdepth=.233+.035*ease
            x=rx*math.sin(a);y=-math.copysign((fdepth if c>0 else bdepth)*abs(c)**.70,c)
            hem=sidehem+(fronthem-sidehem)*front**1.2+(backhem-sidehem)*back**1.1
            z=top+(hem-top)*t+.013*front*math.sin(math.pi*t)
            # Slight fabric ripples replace the smooth bucket silhouette.
            ripple=.0025*math.cos(10*a+1.2*t)*math.sin(math.pi*t)**2
            x+=math.sin(a)*ripple;y-=c*ripple
            # The seated legs keep their support pose during the idle animation.
            # A small thigh influence preserves the tailored lap without twisting
            # its centre into a fold when the two thigh bases have different rolls.
            legmix=(.18*t**1.4)*front**.65
            # Blend across the centre seam in posed space. A hard left/right
            # assignment produces a crease when neighbouring leg matrices differ.
            right=max(0,min(1,.5+x/.08));right=right*right*(3-2*right)
            w={'hips':1-legmix,'thigh.L':legmix*(1-right),'thigh.R':legmix*right}
            p=Vector((x,y,z));rest=blended(w).inverted_safe()@p
            ring.append(surface.vertex(rest,w))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):surface.strip(a,b)
    # Subdivision after inverse binding interpolates incompatible rest positions
    # across the two thighs and tears the lap. This already dense posed surface
    # needs smooth normals, not a second deformation of its bind coordinates.
    skirt=smooth_object(surface.object(),0,.004)
    # Keep anatomical support geometry cache before removing only permanently
    # concealed butt/waist polygons. Exposed knees, arms, neckline and hands stay.
    bm=bmesh.new();bm.from_mesh(main.data);layer=bm.verts.layers.deform.active;hidden=[]
    for f in bm.faces:
        names={};c=Vector()
        for v in f.verts:
            w={groups[g]:a for g,a in v[layer].items() if a>1e-7};c+=blended(w)@v.co
            for n,a in w.items():names[n]=names.get(n,0)+a/len(f.verts)
        c/=len(f.verts)
        pelvis=names.get('hips',0);leg=sum(a for n,a in names.items() if n.startswith('thigh'))
        raw=f.calc_center_median();arm=sum(a for n,a in names.items() if n.startswith(('upper_arm','forearm','upperarm_twist','lowerarm_twist')))
        torso=sum(a for n,a in names.items() if n.startswith('spine'))
        # Remove only source skin permanently inside opaque garments. Retaining
        # the superhero chest under a newly tailored blouse let skin poke through
        # its pockets and shoulder seams when it breathed.
        covered_sleeve=arm>.3 and abs(raw.x)<.417
        exposed_neckline=raw.y<.015 and abs(raw.x)<.100 and raw.z>1.380
        covered_torso=torso>.3 and (raw.z<1.485 or (abs(raw.x)>.065 and raw.z<1.58)) and not exposed_neckline
        a=math.atan2(c.x/.33,-c.y/(.51 if c.y<0 else .27));ca=math.cos(a)
        hem=sidehem+(fronthem-sidehem)*max(ca,0)**1.2+(backhem-sidehem)*max(-ca,0)**1.1
        # Only the seated glute/waist core is permanently occluded. Preserve lower
        # thigh skin below the skirt's curved front hem, including its underside.
        covered_lap=(pelvis>.08 or leg>.15 or torso>.2) and c.z>hem+.006 and c.y>-.56 and raw.z<1.25
        if covered_sleeve or covered_torso or covered_lap:hidden.append(f)
    bmesh.ops.delete(bm,geom=hidden,context='FACES');bm.to_mesh(main.data);bm.free()
    # Conform all trim to the fitted blouse instead of floating rectangular plates.
    tree=BVHTree.FromPolygons([v.co for v in blouse.data.vertices],[list(p.vertices) for p in blouse.data.polygons])
    def front_at(x,z,extra=.004):
        hit=tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        return hit[0].y-extra if hit[0] is not None else None
    stitching=h.material('alice-denim-fine-stitch','8295A0');buttons=h.material('alice-small-metal-buttons','BEBAA5')
    def seam(name,points,bone='spine_03',width=.00065):
        curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=width;curve.bevel_resolution=2;line=curve.splines.new('POLY');line.points.add(len(points)-1)
        for p,v in zip(line.points,points):p.co=(*v,1)
        line.use_cyclic_u=True;obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(stitching)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.parent=rig
        g=obj.vertex_groups.new(name=bone);g.add(list(range(len(obj.data.vertices))),1,'REPLACE');m=obj.modifiers.new('Original garment rig','ARMATURE');m.object=rig
        return obj
    def collar_sample(x,z):
        # Every collar vertex lies on the finished shirt, including its corners.
        # A small outward search finds the real opening edge without extending
        # a leaf across exposed skin when a front ray falls inside the V neck.
        sign=-1 if x<0 else 1
        for outward in [0,.003,.006,.009,.012,.016,.020]:
            hit=tree.ray_cast(Vector((x+sign*outward,-1,z)),Vector((0,1,0)))
            if hit[0] is None:continue
            point,normal,index,_=hit
            # A ray through the open neckline may hit the BACK of the shirt.
            # Such a hit is not a front collar anchor and must be rejected.
            if point.y>.015 or normal.y>-.15:continue
            values={};polygon=blouse.data.polygons[index]
            for vi in polygon.vertices:
                for group in blouse.data.vertices[vi].groups:
                    name=blouse.vertex_groups[group.group].name
                    values[name]=values.get(name,0)+group.weight/len(polygon.vertices)
            values=dict(sorted(values.items(),key=lambda item:item[1],reverse=True)[:4]);total=sum(values.values())
            return point+normal*.0025,{name:value/total for name,value in values.items()}
        return None
    for sign in [-1,1]:
        # Short flat collar leaves follow the actual blouse curvature and skin
        # weights. No hard-coded Y fallback, floating sharp throat corner, or
        # tall collar strip is permitted. Dense surface samples also prevent a
        # planar quad from bridging over the round shirt chest.
        samples=None;steps=8
        for lower in [0,.008,.016,.024]:
            candidate=[];valid=True
            for j in range(steps+1):
                t=j/steps
                for i in range(steps+1):
                    u=i/steps
                    inner_x=.059+.017*t;outer_x=.118-.012*t
                    inner_z=1.568-.047*t;outer_z=1.548-.058*t
                    sample=collar_sample(sign*(inner_x+(outer_x-inner_x)*u),inner_z+(outer_z-inner_z)*u-lower)
                    if sample is None:valid=False;break
                    candidate.append(sample)
                if not valid:break
            if valid:samples=candidate;break
        if samples:
            surface=h.Surface('alice-short-surface-fitted-collar',rig,[shirt]);ids=[surface.vertex(point,w) for point,w in samples]
            for j in range(steps):
                for i in range(steps):
                    a=j*(steps+1)+i;b=a+1;c=b+(steps+1);d=a+(steps+1)
                    surface.face((ids[a],ids[d],ids[c],ids[b]) if sign>0 else (ids[a],ids[b],ids[c],ids[d]))
            smooth_object(surface.object(),0,.002)
        pts=[]
        for x,z in [(sign*.105,1.445),(sign*.175,1.445),(sign*.171,1.388),(sign*.137,1.372),(sign*.108,1.388)]:
            y=front_at(x,z,.005)
            if y is not None:pts.append((x,y,z))
        if len(pts)==5:
            pocket=h.patch('alice-soft-chest-pocket',rig,pts,shirt,'spine_03');smooth_object(pocket,0,.0015);seam('alice-pocket-fine-seam',[(x,y-.0016,z) for x,y,z in pts])
        for z in [1.482,1.407,1.332,1.259]:
            _,rx,f,b,w=profile_at(z);x=sign*(w+.006);y=front_at(x,z,.006)
            if y is not None:
                button=h.patch('alice-small-front-button',rig,[(x+.003*math.cos(TAU*i/16),y,z+.003*math.sin(TAU*i/16)) for i in range(16)],buttons,'spine_03');smooth_object(button,0,.001)
    # The tied hem lies against the waist/lap. No long planar panels intersect the
    # lime dress. All tie cross sections are rounded and terminate close to waist.
    h.loft('alice-small-denim-waist-knot',rig,[(0,-.198,1.192,.023,.013),(0,-.212,1.207,.026,.016),(0,-.199,1.224,.016,.010)],shirt,'spine_02',24)
    for sign in [-1,1]:
        s=h.Surface('alice-soft-flat-waist-tie',rig,[shirt]);last=None
        for j in range(13):
            t=j/12;x=sign*(.018+.074*t);y=-.204-.045*t;z=1.205-.047*t
            width=.020*math.sin(.35+2.5*t)+.003;ring=[]
            for i in range(12):
                a=TAU*i/12;ring.append(s.vertex((x+width*math.cos(a),y+.004*math.sin(a),z+.009*math.cos(a)),{'spine_02':1}))
            if last:s.strip(last,ring)
            else:s.face(tuple(reversed(ring)))
            last=ring
        s.face(last);smooth_object(s.object(),1,0)
    # Packed woven colour is shared by every new denim piece; exportable UVs.
    h.denim_texture(rig,shirt)
    rig['garmentConstruction']='single connected sourcebody shirt and short sleeves; exact cuff loops; inverse-bound seated thigh drape'
    print('ALICE CLOTHING: tailored blouse, rolled short sleeves, thigh-bound skirt; hidden bodyfaces',len(hidden),'supportZ',minhip,flush=True)
