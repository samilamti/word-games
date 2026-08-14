#!/usr/bin/env python
"""
Detect floating parts in a character built by render_enemies.py.

A chibi model is a pile of separate primitives, and a part that drifts loose
from the body is both easy to introduce (nudge a parent, orphan a child) and
surprisingly hard to see in a render — especially against a transparent
background at the size these sprites actually ship at. Eyeballing it costs
review rounds; this makes it a check.

Method: build a world-space BVH per mesh, treat two parts as joined when any
vertex of one lies within THRESHOLD of the other's surface, then flood-fill from
the largest part. Anything the fill doesn't reach is reported with its location.

World space matters. `closest_point_on_mesh` minimises in LOCAL space, and
transforming normals with `matrix_world.to_3x3()` corrupts them under the
non-uniform scale every one of these primitives uses — both shortcuts invent
connections and will pass a visibly detached model.

Blind spot worth knowing: a small part fully buried inside a larger one reads as
connected, which is correct here, and a part that pokes through a surface is
what we want anyway.

Usage:
    /Applications/Blender.app/Contents/MacOS/Blender --background \\
        --python scripts/blender/check_attachment.py -- hero
"""
import sys
from collections import deque

import bpy
from mathutils.bvhtree import BVHTree

# Parts closer than this are treated as joined. Generous enough to tolerate a
# deliberate seam, tight enough that a genuinely floating part still reads as
# floating.
THRESHOLD = 0.05


def world_bvh(obj):
    """BVH of `obj` in world space, plus its world-space vertices."""
    mesh = obj.data
    verts = [obj.matrix_world @ v.co for v in mesh.vertices]
    polys = [tuple(p.vertices) for p in mesh.polygons]
    return BVHTree.FromPolygons(verts, polys), verts


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    name = args[0] if args else "hero"

    # Import the builders from the sibling render script.
    sys.path.insert(0, bpy.path.abspath("//scripts/blender"))
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "render_enemies",
        bpy.path.abspath("//scripts/blender/render_enemies.py"),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    builders = dict(mod.ENEMIES)
    if name not in builders:
        raise SystemExit(f"unknown character '{name}'. Known: {', '.join(builders)}")

    mod.reset_scene()
    builders[name]()

    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not objs:
        raise SystemExit("no meshes built")

    print(f"[check] {name}: {len(objs)} parts")

    trees, vert_sets = {}, {}
    for o in objs:
        trees[o.name], vert_sets[o.name] = world_bvh(o)

    # Adjacency by surface distance, both directions (a small part's vertices may
    # miss a large neighbour's surface while the reverse test succeeds).
    names = [o.name for o in objs]
    adj = {n: set() for n in names}
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            joined = False
            for src, dst in ((a, b), (b, a)):
                for v in vert_sets[src]:
                    hit = trees[dst].find_nearest(v)
                    if hit and hit[3] is not None and hit[3] <= THRESHOLD:
                        joined = True
                        break
                if joined:
                    break
            if joined:
                adj[a].add(b)
                adj[b].add(a)

    # Flood-fill from the part with the most geometry — the body, in practice.
    root = max(names, key=lambda n: len(vert_sets[n]))
    seen = {root}
    queue = deque([root])
    while queue:
        cur = queue.popleft()
        for nxt in adj[cur]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)

    floating = [n for n in names if n not in seen]
    if not floating:
        print(f"[check] ✓ all {len(names)} parts connected (root: {root})")
        return

    print(f"[check] ✗ {len(floating)} floating part(s), root was '{root}':")
    for n in floating:
        obj = bpy.data.objects[n]
        loc = obj.matrix_world.translation
        # Report the nearest neighbour and its gap, which is usually enough to
        # see what the part was meant to attach to.
        best, best_d = None, float("inf")
        for other in names:
            if other == n:
                continue
            for v in vert_sets[n]:
                hit = trees[other].find_nearest(v)
                if hit and hit[3] is not None and hit[3] < best_d:
                    best_d, best = hit[3], other
        print(f"   - {n} at ({loc.x:.2f}, {loc.y:.2f}, {loc.z:.2f}) "
              f"— nearest '{best}' is {best_d:.3f} away (threshold {THRESHOLD})")
    raise SystemExit(1)


if __name__ == "__main__":
    main()
