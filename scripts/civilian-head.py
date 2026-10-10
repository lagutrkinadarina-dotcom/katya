"""Connected civilian faces and fitted hairstyles authored for the empty-scene rig.

Imported by build-detainees.py. Uses its Surface/patch/material helpers; all
coordinates are metres in Blender's Z-up, front-negative-Y model space.
"""

import math

import bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


TAU = math.tau


def smooth(a, b, value):
    t = max(0, min(1, (value - a) / (b - a)))
    return t * t * (3 - 2 * t)


def closed(obj, label):
    data = bmesh.new()
    data.from_mesh(obj.data)
    assert all(len(edge.link_faces) == 2 for edge in data.edges), f'Open {label} surface'
    data.free()


def build_head(rig, woman, skin, Surface, patch, material):
    # Cheek, jaw and temple sections form one head surface. The nose only
    # affects the three middle front columns, rather than an entire cheek row.
    levels = [
        (1.587, .054, .050), (1.612, .068, .058),
        (1.635, .084, .070), (1.662, .093, .079),
        (1.690, .101, .086), (1.711, .107, .093),
        (1.719, .107, .093), (1.727, .107, .092), (1.741, .105, .091),
        (1.766, .104, .093), (1.792, .104, .095),
        (1.821, .103, .095), (1.850, .096, .089),
        (1.873, .076, .073), (1.883, .035, .038),
    ]
    if not woman:
        levels = [(z, rx * (1.035 if z < 1.67 else 1.02), ry) for z, rx, ry in levels]
    fractions = [-1, -.93, -.80, -.62, -.42, -.24, -.12, 0, .12, .24, .42, .62, .80, .93, 1]
    projection = {5: .006, 6: .020, 7: .022, 8: .0175, 9: .009, 10: .003}

    def row_y(fraction, row):
        _, _, radius = levels[row]
        distance = abs(fraction)
        nose = (1 - .25 * (distance / .12) ** 2) if distance <= .12 else .75 * max(0, 1 - (distance - .12) / .12)
        return -radius * math.sqrt(max(0, 1 - fraction * fraction)) - projection.get(row, 0) * nose

    def surface_y(x, z):
        for row in range(len(levels) - 1):
            if levels[row][0] <= z <= levels[row + 1][0]:
                t = (z - levels[row][0]) / (levels[row + 1][0] - levels[row][0])
                # Intersect the actual triangulated head, including its diagonal.
                for column in range(len(fractions) - 1):
                    points = [(levels[r][1] * fractions[c], row_y(fractions[c], r), levels[r][0])
                              for r, c in [(row, column), (row, column + 1), (row + 1, column + 1), (row + 1, column)]]
                    for indices in [(0, 1, 2), (0, 2, 3)]:
                        a, b, c = [points[i] for i in indices]
                        denominator = (b[2]-c[2])*(a[0]-c[0]) + (c[0]-b[0])*(a[2]-c[2])
                        u = ((b[2]-c[2])*(x-c[0]) + (c[0]-b[0])*(z-c[2])) / denominator
                        v = ((c[2]-a[2])*(x-c[0]) + (a[0]-c[0])*(z-c[2])) / denominator
                        w = 1-u-v
                        if min(u,v,w) >= -1e-8:
                            return u*a[1]+v*b[1]+w*c[1]
        raise ValueError(f'Facial feature outside the head: {x}, {z}')

    head = Surface('sculpted-human-head', rig, [skin])
    rings = []
    for row, (z, rx, ry) in enumerate(levels):
        ring = [head.vertex((rx * f, row_y(f, row), z), {'head': 1}) for f in fractions]
        for i in range(1, 12):
            angle = math.pi * i / 12
            ring.append(head.vertex((rx * math.cos(angle), ry * math.sin(angle), z), {'head': 1}))
        rings.append(ring)
    for lower, upper in zip(rings, rings[1:]):
        head.strip(lower, upper)
    head.face(tuple(reversed(rings[0])))
    head.face(rings[-1])
    closed(head.object(), 'head')

    # Small faceted ears follow the temple instead of rectangular protrusions.
    for sign, label in [(-1, 'L'), (1, 'R')]:
        ear = Surface('natural-ear-' + label, rig, [skin])
        rings = []
        for x, width, height in [(.105, .017, .034), (.118, .015, .032), (.125, .008, .023)]:
            rings.append([ear.vertex((sign * x, .002 + width * math.cos(TAU * i / 10), 1.752 + height * math.sin(TAU * i / 10)), {'head': 1}) for i in range(10)])
        for lower, upper in zip(rings, rings[1:]):
            ear.strip(lower, upper)
        ear.face(tuple(reversed(rings[0])))
        ear.face(rings[-1])
        closed(ear.object(), 'ear')

    white = material('eye-white', 'E4DFD0')
    iris = material('brown-iris', '66523B' if woman else '5E4D37')
    pupil = material('eye-pupil', '25221D')
    brow = material('auburn-brows' if woman else 'brown-brows', '673B2B' if woman else '624B38')
    lid = material('upper-lids', 'AD805F' if woman else '855841')
    eyes = Surface('eyes-eyelids-and-brows', rig, [white, iris, pupil, brow, lid])
    eye_z = 1.785

    blink_depths = {}

    def polygon(points, slot, offset, blink=False):
        # Dense conforming triangles cannot cut through the faceted cheek like
        # the old nonplanar n-gons. Each layer retains its own surface clearance.
        vectors = [Vector((x, z, 0)) for x, z in points]
        for indices in tessellate_polygon([vectors]):
            triangle = [vectors[index] for index in indices]
            n = 6
            grid = {}
            for i in range(n+1):
                for j in range(n+1-i):
                    point = triangle[0] + (triangle[1]-triangle[0])*(i/n) + (triangle[2]-triangle[0])*(j/n)
                    x, z = point.x, point.y
                    index = eyes.vertex((x, surface_y(x,z)-offset, z), {'head':1})
                    grid[i,j] = index
                    if blink:
                        eyes.blink.append((index,eye_z))
                        blink_depths[index] = offset
            for i in range(n):
                for j in range(n-i):
                    eyes.face((grid[i,j],grid[i+1,j],grid[i,j+1]),slot)
                    if i+j < n-1:
                        eyes.face((grid[i+1,j],grid[i+1,j+1],grid[i,j+1]),slot)

    for sign in [-1, 1]:
        x = sign * .047
        almond = [(-.022, 0), (-.010, .009), (.009, .010), (.022, 0), (.010, -.008), (-.010, -.007)]
        polygon([(x + dx, eye_z + dz) for dx, dz in almond], 0, .0014, True)
        for rx, rz, slot, offset in [(.0080, .0088, 1, .0024), (.0042, .0060, 2, .0031)]:
            polygon([(x + rx * math.cos(TAU * i / 12), eye_z + rz * math.sin(TAU * i / 12)) for i in range(12)], slot, offset, True)
        polygon([(x -.0028 + .0014 * math.cos(TAU * i / 8), eye_z + .0033 + .0016 * math.sin(TAU * i / 8)) for i in range(8)], 0, .0037, True)
        polygon([(x + dx, eye_z + dz) for dx, dz in [(-.022, 0), (-.010, .010), (.009, .011), (.022, 0), (.020, .001), (.008, .0085), (-.010, .0075), (-.020, -.001)]], 4, .0019, True)
        polygon([(x + dx, 1.816 + dz) for dx, dz in [(-.024, 0), (-.009, .006), (.011, .004), (.024, -.002), (.021, -.006), (.008, -.002), (-.008, .0005), (-.023, -.005)]], 3, .0030)
    eye_object = eyes.object()
    blink_key = eye_object.data.shape_keys.key_blocks['Blink']
    for index, offset in blink_depths.items():
        point = blink_key.data[index].co
        point.y = surface_y(point.x, point.z) - offset

    # Lips and nostrils are thin conforming details, never extended plates.
    lips = material('natural-lips', 'A56450' if woman else '815444')
    crease = material('lip-and-nose-shadow', '704A38' if woman else '624130')

    def face_patch(name, points, mat, offset=.0014):
        return patch(name, rig, [(x, surface_y(x, z) - offset, z) for x, z in points], mat, 'head')

    face_patch('upper-lip', [(-.024, 1.680), (-.008, 1.686), (0, 1.682), (.008, 1.686), (.024, 1.680), (.012, 1.678), (-.012, 1.678)], lips)
    face_patch('lower-lip', [(-.021, 1.678), (.021, 1.678), (.012, 1.671), (-.012, 1.671)], lips)
    face_patch('mouth-crease', [(-.024, 1.680), (-.012, 1.677), (.012, 1.677), (.024, 1.680), (.012, 1.6758), (-.012, 1.6758)], crease, .0020)
    for sign in [-1, 1]:
        face_patch('nostril-' + str(sign), [(sign * .007, 1.714), (sign * .016, 1.715), (sign * .012, 1.711)], crease, .0009)

    build_hair(rig, woman, Surface, material)


def build_hair(rig, woman, Surface, material):
    mats = [
        material('auburn-hair' if woman else 'brown-hair', '943E28' if woman else '684C37'),
        material('hair-highlight', 'A74930' if woman else '77573D'),
        material('hair-shadow', '81351F' if woman else '5B422F'),
    ]
    hair = Surface('fitted-long-hair' if woman else 'fitted-short-hair', rig, mats)
    count = 32
    shells = []
    for inner in [False, True]:
        rows = []
        for row in range(6):
            ring = []
            for i in range(count):
                angle = TAU * i / count
                absolute = min(angle, TAU - angle)
                sine = math.sin(angle)
                cosine = math.cos(angle)
                side = abs(sine)
                back = max(0, -cosine)
                if woman:
                    line = 1.834 + .012 * math.exp(-(absolute / .22) ** 2)
                    if absolute <= .72:
                        rim_z = line
                    elif absolute < 1.36:
                        rim_z = line * (1 - smooth(.72, 1.36, absolute)) + 1.490 * smooth(.72, 1.36, absolute)
                    else:
                        rim_z = 1.490 - .145 * smooth(1.36, math.pi, absolute)
                    if row < 4:
                        t = [0, .37, .73, 1][row]
                        z = rim_z * (1 - t) + 1.851 * t
                        rx = (.116 + .006 * side) * (1 - t) + .109 * t
                        ry = (.101 + .037 * back) * (1 - t) + .101 * t
                        center_y = .011
                    elif row == 4:
                        z = 1.880
                        rx, ry, center_y = .084, .084, .004
                    else:
                        z = 1.897
                        rx, ry, center_y = .008, .012, .009
                else:
                    line = 1.834 + .008 * math.exp(-(absolute / .26) ** 2)
                    rim_z = line - .066 * smooth(.72, math.pi, absolute)
                    if row < 4:
                        t = [0, .33, .68, 1][row]
                        z = rim_z * (1 - t) + 1.852 * t
                        rx = (.110 - .004 * back) * (1 - t) + .108 * t
                        ry = (.100 - .009 * back) * (1 - t) + .101 * t
                        center_y = .006
                    elif row == 4:
                        z = 1.880
                        rx, ry, center_y = .084, .084, .004
                    else:
                        z = 1.892
                        rx, ry, center_y = .008, .012, .008
                x = rx * sine
                y = center_y - ry * cosine
                if inner:
                    x *= .979
                    y = center_y + (y - center_y) * .979
                    z -= .0015
                head_weight = smooth(1.37, 1.65, z) if woman else 1
                ring.append(hair.vertex((x, y, z), {'head': head_weight, 'spine': 1 - head_weight}))
            rows.append(ring)
        for lower, upper in zip(rows, rows[1:]):
            hair.strip(lower, upper)
        hair.face(rows[-1])
        shells.append(rows)
    hair.strip(shells[1][0], shells[0][0])
    obj = hair.object()
    closed(obj, 'hair')
    for polygon in obj.data.polygons:
        center = polygon.center
        if woman and abs(center.x) < .009 and center.y < -.074:
            polygon.material_index = 2  # A subtle centered part in the same mesh.
        elif center.x < -.033 and center.y < .05:
            polygon.material_index = 1
        else:
            polygon.material_index = 0
