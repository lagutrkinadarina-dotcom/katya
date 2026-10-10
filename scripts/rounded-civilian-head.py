"""Rounded cartoon civilian heads, real skinned geometry for the game rig."""
import math
from mathutils import Vector
TAU=math.tau

def build_head(rig,woman,skin,Surface,patch,material):
    def finish(surface):
        obj=surface.object()
        for polygon in obj.data.polygons:polygon.use_smooth=True
        return obj
    def ellipsoid(surface,center,radii,slot=0,blink=False,rotation=0):
        rings=[];cx,cy,cz=center;rx,ry,rz=radii
        for j in range(1,16):
            latitude=-math.pi/2+math.pi*j/16;ring=[]
            for i in range(32):
                angle=TAU*i/32;x=rx*math.cos(latitude)*math.cos(angle);z=rz*math.sin(latitude)
                p=(cx+x*math.cos(rotation)-z*math.sin(rotation),cy+ry*math.cos(latitude)*math.sin(angle),cz+x*math.sin(rotation)+z*math.cos(rotation))
                index=surface.vertex(p,{'head':1});ring.append(index)
                if blink:surface.blink.append((index,cz))
            rings.append(ring)
        for a,b in zip(rings,rings[1:]):surface.strip(a,b,slot)
        for ids,z in [(rings[0],cz-rz),(rings[-1],cz+rz)]:
            pole=surface.vertex((cx,cy,z),{'head':1})
            if blink:surface.blink.append((pole,cz))
            for i in range(32):surface.face((pole,ids[i],ids[(i+1)%32]),slot)
    face=Surface('rounded-cartoon-head',rig,[skin]);rows=[]
    sections=[(1.583,.054,.049),(1.604,.075,.061),(1.630,.102,.077),(1.665,.123,.091),(1.710,.139,.108),(1.754,.145,.116),(1.800,.142,.111),(1.842,.133,.103),(1.881,.112,.084),(1.908,.071,.055),(1.920,.012,.012)]
    if not woman:sections=[(z,rx*1.035,ry) for z,rx,ry in sections]
    for z,rx,ry in sections:
        rows.append([face.vertex((rx*math.sin(TAU*i/64),-ry*math.cos(TAU*i/64),z),{'head':1}) for i in range(64)])
    for a,b in zip(rows,rows[1:]):face.strip(a,b)
    face.face(tuple(reversed(rows[0])));face.face(rows[-1]);head=finish(face)
    # One subdivision of the closed head rounds the cheek and jaw silhouette.
    import bpy
    bpy.context.view_layer.objects.active=head
    sub=head.modifiers.new('Rounded cheek contours','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    ears=Surface('soft-rounded-ears',rig,[skin])
    for sign in [-1,1]:ellipsoid(ears,(sign*.157,.002,1.773),(.024,.016,.033))
    finish(ears)
    nose=Surface('rounded-button-nose',rig,[skin]);ellipsoid(nose,(0,-.112,1.746),(.018,.022,.023));finish(nose)
    white=material('cartoon-eye-white','F8F4E6');iris=material('cartoon-iris','536847' if woman else '755737');black=material('cartoon-pupil','23201C');shine=material('eye-glint','FFFFFF')
    eyes=Surface('rounded-eyes-with-blink',rig,[white,iris,black,shine]);eye_z=1.803
    for sign in [-1,1]:
        x=sign*.057
        ellipsoid(eyes,(x,-.1035,eye_z),(.027,.011,.022),0,True)
        ellipsoid(eyes,(x,-.113,eye_z),(.011,.003,.014),1,True)
        ellipsoid(eyes,(x,-.1155,eye_z),(.006,.0018,.009),2,True)
        ellipsoid(eyes,(x-.003,-.1172,eye_z+.006),(.003,.0012,.0038),3,True)
    finish(eyes)
    brow=material('soft-brows','713824' if woman else '543B28');brows=Surface('rounded-expressive-brows',rig,[brow])
    for sign in [-1,1]:ellipsoid(brows,(sign*.057,-.098,1.846),(.026,.0045,.007),rotation=sign*(-.12 if woman else .12))
    finish(brows)
    lip=material('cartoon-mouth','904638' if woman else '694438');mouth=Surface('soft-mouth-curve',rig,[lip])
    # Small joined tube, rather than a protruding triangular mouth card.
    rings=[]
    for i in range(17):
        x=-.029+.058*i/16;z=1.684+.005*(x/.029)**2;y=-.101*math.sqrt(1-(x/.133)**2)
        rings.append([mouth.vertex((x,y+.0026*math.cos(TAU*j/8),z+.0032*math.sin(TAU*j/8)),{'head':1}) for j in range(8)])
    for a,b in zip(rings,rings[1:]):mouth.strip(a,b)
    mouth.face(tuple(reversed(rings[0])));mouth.face(rings[-1]);finish(mouth)
    hairmat=material('rounded-auburn-hair' if woman else 'rounded-brown-hair','9A4027' if woman else '645039')
    hair=Surface('rounded-sculpted-hair',rig,[hairmat]);count=64;shells=[]
    for inner in [False,True]:
        rows=[]
        for row in range(9):
            t=row/8;ring=[]
            for i in range(count):
                a=TAU*i/count;distance=min(a,TAU-a);side=abs(math.sin(a));back=max(0,-math.cos(a))
                blend=max(0,min(1,(distance-.65)/.65));blend=blend*blend*(3-2*blend)
                rim=1.87-(.49*blend if woman else .091*blend)
                if row<6:
                    f=row/5;z=rim+(1.885-rim)*f;rx=(.171+.006*side)*(1-f)+.145*f;ry=(.122+.026*back)*(1-f)+.11*f
                else:
                    u=(row-5)/3;z=1.885+.07*math.sin(u*math.pi/2);rx=.139*math.cos(u*math.pi/2)+.003;ry=.11*math.cos(u*math.pi/2)+.003
                x=rx*math.sin(a);y=.005-ry*math.cos(a)
                if inner:x*=.96;y=.005+(y-.005)*.96;z-=.002
                weight=1 if not woman else max(0,min(1,(z-1.40)/.28))
                ring.append(hair.vertex((x,y,z),{'head':weight,'spine':1-weight}))
            rows.append(ring)
        for a,b in zip(rows,rows[1:]):hair.strip(a,b)
        hair.face(rows[-1]);shells.append(rows)
    hair.strip(shells[1][0],shells[0][0]);finish(hair)
    # Overlapping, rounded locks give a sculpted cartoon fringe and a side part.
    fringe=Surface('volumetric-hair-locks',rig,[hairmat])
    for x,z,rx,rz,angle in [(-.099,1.872,.025,.039,-.38),(-.062,1.892,.027,.041,-.32),(-.019,1.901,.027,.037,-.25),(.025,1.910,.027,.033,-.20),(.067,1.906,.025,.027,-.18),(.108,1.894,.021,.028,.22)]:
        ellipsoid(fringe,(x,-.098,z),(rx,.026,rz),rotation=angle)
    locks=finish(fringe)
    bpy.context.view_layer.objects.active=locks
    remesh=locks.modifiers.new('Joined sculpted fringe','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.0025;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    locks.vertex_groups.clear();group=locks.vertex_groups.new(name='head');group.add(list(range(len(locks.data.vertices))),1,'REPLACE')
    smooth=locks.modifiers.new('Soft merged locks','SMOOTH');smooth.factor=.5;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
    rig['visualStyle']='rounded-cartoon'
