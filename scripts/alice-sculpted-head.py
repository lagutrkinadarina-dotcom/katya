"""Sculpted Alice head with integrated nose, almond eyes and parted hair."""
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
    sections=[(1.583,.048,.046),(1.604,.066,.054),(1.630,.090,.068),(1.665,.112,.080),(1.710,.126,.094),(1.754,.134,.101),(1.800,.133,.100),(1.842,.127,.100),(1.881,.112,.084),(1.908,.071,.055),(1.930,.012,.012)]
    def dimensions(z):
        for k,(a,b) in enumerate(zip(sections,sections[1:])):
            if a[0]<=z<=b[0]:
                t=(z-a[0])/(b[0]-a[0]);p=sections[max(0,k-1)];q=sections[min(len(sections)-1,k+2)]
                def cubic(c):
                    m0=(b[c]-p[c])/(b[0]-p[0])*(b[0]-a[0]);m1=(q[c]-a[c])/(q[0]-a[0])*(b[0]-a[0])
                    return (2*t**3-3*t*t+1)*a[c]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[c]+(t**3-t*t)*m1
                return cubic(1),cubic(2)
        return sections[0][1:] if z<sections[0][0] else sections[-1][1:]
    def gauss(x,z,cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
    def front(x,z):
        rx,ry=dimensions(z);y=-ry*math.sqrt(max(.01,1-(x/rx)**2))
        depth=.020*gauss(x,z,0,1.758,.014,.052)+.028*gauss(x,z,0,1.733,.019,.017)
        depth+=.008*(gauss(x,z,-.019,1.727,.011,.009)+gauss(x,z,.019,1.727,.011,.009))
        depth+=.007*(gauss(x,z,-.071,1.751,.034,.027)+gauss(x,z,.071,1.751,.034,.027))
        depth+=.007*gauss(x,z,0,1.687,.041,.023)
        depth-=.004*(gauss(x,z,-.053,1.793,.032,.019)+gauss(x,z,.053,1.793,.032,.019))
        return y-depth
    for j in range(161):
        z=1.583+(1.930-1.583)*j/160;rx,ry=dimensions(z)
        rows.append([face.vertex((rx*math.sin(TAU*i/160),front(rx*math.sin(TAU*i/160),z) if math.cos(TAU*i/160)>0 else -ry*math.cos(TAU*i/160),z),{'head':1}) for i in range(160)])
    for a,b in zip(rows,rows[1:]):face.strip(a,b)
    face.face(tuple(reversed(rows[0])));face.face(rows[-1]);head=finish(face)
    # Packed painted skin atlas: warm cheeks and subtle forehead variation.
    import bpy
    image=bpy.data.images.new('Alice-painted-skin',width=256,height=256,alpha=True)
    pixels=[]
    import random
    rng=random.Random(41)
    for j in range(256):
        z=1.583+.347*j/255
        for i in range(256):
            a=TAU*i/255;rx,ry=dimensions(z);x=rx*math.sin(a)
            blush=(gauss(x,z,-.074,1.750,.035,.027)+gauss(x,z,.074,1.750,.035,.027))*max(0,math.cos(a))
            noise=(rng.random()-.5)*.009
            pixels.extend((.835+noise,.659-.035*blush+noise,.490-.018*blush+noise,1))
    image.pixels=pixels;image.pack()
    painted=skin.copy();painted.name='Alice-painted-skin-material'
    texture=painted.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
    painted.node_tree.links.new(texture.outputs['Color'],painted.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    head.data.materials[0]=painted
    uv=head.data.uv_layers.new(name='Alice-skin-atlas')
    for polygon in head.data.polygons:
        us=[]
        for idx in polygon.loop_indices:
            v=head.data.vertices[head.data.loops[idx].vertex_index].co;rx,ry=dimensions(v.z)
            u=(math.atan2(v.x/rx,-v.y/ry)%TAU)/TAU;us.append(u)
        crossing=max(us)-min(us)>.5
        for idx,u in zip(polygon.loop_indices,us):
            v=head.data.vertices[head.data.loops[idx].vertex_index].co
            uv.data[idx].uv=(u+1 if crossing and u<.5 else u,(v.z-1.583)/.347)

    import bpy
    ears=Surface('soft-rounded-ears',rig,[skin])
    for sign in [-1,1]:ellipsoid(ears,(sign*.135,.005,1.773),(.016,.012,.029))
    finish(ears)
    white=material('Alice-warm-eye-white','DFD8C5');iris=material('Alice-hazel-iris','58634A');black=material('Alice-pupil','242019')
    eyes=Surface('Alice-almond-eyes-with-blink',rig,[white,iris,black]);eye_z=1.792
    def tube(name,points,radius,mat):
        surface=Surface(name,rig,[mat]);rings=[]
        for index,(x,y,z) in enumerate(points):
            r=radius*(.45+.55*math.sin(math.pi*(index+.5)/len(points)))
            rings.append([surface.vertex((x,y+r*math.cos(TAU*k/8),z+r*math.sin(TAU*k/8)),{'head':1}) for k in range(8)])
        for a,b in zip(rings,rings[1:]):surface.strip(a,b)
        surface.face(tuple(reversed(rings[0])));surface.face(rings[-1]);return finish(surface)
    brow=material('Alice-shaped-brows','633421')
    for sign in [-1,1]:
        cx=sign*.053;cz=eye_z;rings=[]
        for j in range(9):
            r=j/8;ids=[]
            for i in range(48):
                a=TAU*i/48;x=cx+.028*r*math.cos(a);z=cz+.011*r*math.sin(a)+sign*(x-cx)*.06;y=front(x,z)-.0015-.004*(1-r*r)
                idx=eyes.vertex((x,y,z),{'head':1});eyes.blink.append((idx,cz));ids.append(idx)
            rings.append(ids)
        for a,b in zip(rings,rings[1:]):eyes.strip(a,b)
        for rad,slot,offset in [(.009,1,.0065),(.0042,2,.0075)]:
            center=eyes.vertex((cx,front(cx,cz)-offset,cz),{'head':1});eyes.blink.append((center,cz));ids=[]
            for i in range(48):
                a=TAU*i/48;x=cx+rad*math.cos(a);z=cz+rad*math.sin(a);idx=eyes.vertex((x,front(x,z)-offset,z),{'head':1});eyes.blink.append((idx,cz));ids.append(idx)
            for i in range(48):eyes.face((center,ids[i],ids[(i+1)%48]),slot)
        for upper in [True,False]:
            points=[]
            for i in range(33):
                a=math.pi*i/32;x=cx+.028*math.cos(a);z=cz+(.011 if upper else -.011)*math.sin(a)+sign*(x-cx)*.06
                points.append((x,front(x,z)-.003,z))
            tube('Alice-eyelid-rim',points,.0022,skin)
        points=[]
        for i in range(25):
            x=cx-.027+.054*i/24;z=1.823+.006*math.sin(math.pi*i/24)-sign*(x-cx)*.10;points.append((x,front(x,z)-.0018,z))
        tube('Alice-arched-brow',points,.0034,brow)
    finish(eyes)
    lip=material('Alice-natural-lips','A86855')
    for upper in [True,False]:
        pts=[]
        for i in range(41):
            x=-.031+.062*i/40;t=x/.031;z=1.687+(.003*(1-t*t)+.001*math.cos(t*math.pi*2) if upper else -.004*(1-t*t));pts.append((x,front(x,z)-.002,z))
        tube('Alice-modelled-lip',pts,.0020,lip)
    tube('Alice-mouth-line',[(x,front(x,1.687)-.003,1.687) for x in [-.030+i*.060/40 for i in range(41)]],.0007,material('Alice-mouth-shadow','663B30'))
    hairmat=material('rounded-auburn-hair' if woman else 'rounded-brown-hair','722C1B' if woman else '645039')
    hair=Surface('rounded-sculpted-hair',rig,[hairmat]);count=128;shells=[]
    for inner in [False,True]:
        rows=[]
        for row in range(33):
            t=row/32;ring=[]
            for i in range(count):
                a=TAU*i/count;distance=min(a,TAU-a);side=abs(math.sin(a));back=max(0,-math.cos(a))
                blend=max(0,min(1,(distance-.65)/.65));blend=blend*blend*(3-2*blend)
                rim=1.858+.010*math.sin(a*2)-(.49*blend if woman else .091*blend)
                if row<21:
                    f=row/20;z=rim+(1.885-rim)*f;rx=(.151+.005*side)*(1-f)+.145*f;ry=(.122+.026*back)*(1-f)+.11*f
                else:
                    u=(row-20)/12;z=1.885+.07*math.sin(u*math.pi/2);rx=.139*math.cos(u*math.pi/2)+.003;ry=.11*math.cos(u*math.pi/2)+.003
                wave=.0012*math.cos(a*30+z*5)*math.sin(math.pi*t)
                x=(rx+wave)*math.sin(a);y=.005-(ry+wave)*math.cos(a)
                if inner:x*=.96;y=.005+(y-.005)*.96;z-=.002
                weight=1 if not woman else max(0,min(1,(z-1.40)/.28))
                ring.append(hair.vertex((x,y,z),{'head':weight,'spine':1-weight}))
            rows.append(ring)
        for a,b in zip(rows,rows[1:]):hair.strip(a,b)
        hair.face(rows[-1]);shells.append(rows)
    hair.strip(shells[1][0],shells[0][0]);finish(hair)
    rig['visualStyle']='sculpted-stylized-Alice'
