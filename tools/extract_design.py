"""Read-only IDML -> Magazine Design Model v2. Python 3 stdlib; no INDD parser.

Raw XML trees are preservation data, NEVER instructions or executable properties.
The output contains original text and link metadata: keep it private like the IDML.
"""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path, PurePosixPath
import zipfile
import xml.etree.ElementTree as ET
from xml.parsers import expat

SCHEMA = "magazine-studio-design/v2"
ITEMS = {"TextFrame", "Rectangle", "Oval", "Polygon", "GraphicLine", "Group"}
IDENTITY = [1, 0, 0, 1, 0, 0]


def tag(e):
    if e.tag is ET.ProcessingInstruction:
        return "#pi"
    if e.tag is ET.Comment:
        return "#comment"
    return e.tag.split("}")[-1]


def raw(e):
    if e.tag is ET.ProcessingInstruction:
        target, _, data = (e.text or "").partition(" ")
        return {"tag": "#pi", "target": target, "data": data, "tail": e.tail or ""}
    if e.tag is ET.Comment:
        return {"tag": "#comment", "text": e.text or "", "tail": e.tail or ""}
    return {"tag": e.tag, "attributes": dict(e.attrib), "text": e.text or "",
            "tail": e.tail or "", "children": [raw(c) for c in e]}


def pi_evidence(data):
    """Independent event parse of original package bytes, not the model tree."""
    parser = expat.ParserCreate(namespace_separator="}")
    stack, records, before, after = [], [], [], []
    root_seen = False
    def start(name, attrs):
        nonlocal root_seen
        name = name.split("}")[-1]
        index = stack[-1]["counts"].get(name, 0) if stack else 0
        if stack:
            finish_tail()
            stack[-1]["counts"][name] = index + 1
        path = (stack[-1]["path"] if stack else "") + "/" + name + "[" + str(index) + "]"
        stack.append({"path": path, "counts": {}, "text": ""})
        root_seen = True
    def end(name):
        finish_tail()
        stack.pop()
        if stack:
            stack[-1]["text"] = ""
    def text(value):
        if stack:
            stack[-1]["text"] += value
    def finish_tail():
        if stack and "pending_pi" in stack[-1]:
            records[stack[-1].pop("pending_pi")]["after"] = stack[-1]["text"]
    def pi(target, value):
        finish_tail()
        records.append({"path": stack[-1]["path"] if stack else ("/after" if root_seen else "/before"),
                        "target": target, "data": value, "before": stack[-1]["text"] if stack else "", "after": ""})
        if stack:
            stack[-1]["text"] = ""
            stack[-1]["pending_pi"] = len(records) - 1
        else:
            (after if root_seen else before).append({"tag": "#pi", "target": target, "data": value})
    def comment(value):
        if stack:
            finish_tail()
            stack[-1]["text"] = ""
        else:
            (after if root_seen else before).append({"tag": "#comment", "text": value})
    parser.StartElementHandler, parser.EndElementHandler = start, end
    parser.CharacterDataHandler, parser.ProcessingInstructionHandler = text, pi
    parser.CommentHandler = comment
    parser.Parse(data, True)
    return records, before, after


def scalar(s):
    if s in ("true", "false"):
        return s == "true"
    try:
        n = float(s)
        return n if math.isfinite(n) else s
    except (ValueError, TypeError):
        return s


def property_value(e):
    if e.get("type") == "list":
        return [property_value(c) for c in e]
    if len(e):
        return raw(e)
    if set(e.attrib)-{"type"}:
        return {k: scalar(v) for k, v in e.attrib.items()}
    if e.get("type") in ("string", "object", "enumeration"):
        return e.text or ""
    return scalar(e.text or "")


def properties(e):
    """IDML property names retained; no synthetic defaults or enum coercion."""
    string_keys = {"Self", "Name", "FontFamily", "FontStyle", "FontStyleName", "FullName", "PostScriptName", "Label"}
    out = {k: v if k in string_keys else scalar(v) for k, v in e.attrib.items()}
    p = e.find("Properties")
    if p is not None:
        for c in p:
            out[tag(c)] = property_value(c)
    return out


def nums(s, count=None):
    v = [float(x) for x in s.split()]
    if (count is not None and len(v) != count) or not all(math.isfinite(x) for x in v):
        raise ValueError("Invalid IDML geometry")
    return v


def detail_properties(e):
    out = properties(e)
    children = [raw(c) for c in e if tag(c) != "Properties"]
    if children:
        out["children"] = children
    return out


def matrix(e):
    return nums(e.get("ItemTransform", "1 0 0 1 0 0"), 6)


def compose(a, b):
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]


def inverse(a):
    d = a[0]*a[3]-a[1]*a[2]
    if abs(d) < 1e-12:
        raise ValueError("Singular IDML transform")
    return [a[3]/d, -a[1]/d, -a[2]/d, a[0]/d,
            (a[2]*a[5]-a[3]*a[4])/d, (a[1]*a[4]-a[0]*a[5])/d]


def point(a, p):
    return [a[0]*p[0]+a[2]*p[1]+a[4], a[1]*p[0]+a[3]*p[1]+a[5]]


def box(points):
    if not points:
        return None
    xs, ys = zip(*points)
    return [min(ys), min(xs), max(ys), max(xs)]


def rectangle_points(b):
    return [[b[1], b[0]], [b[3], b[0]], [b[3], b[2]], [b[1], b[2]]]


class Package:
    def __init__(self, path):
        self.zip = zipfile.ZipFile(path)
        info = self.zip.infolist()
        names = [i.filename for i in info]
        if len(names) != len(set(names)) or len(names) > 5000:
            self.zip.close()
            raise ValueError("Duplicate/too many ZIP members")
        if sum(i.file_size for i in info) > 128*1024*1024:
            self.zip.close()
            raise ValueError("IDML package too large")
        for i in info:
            p = PurePosixPath(i.filename)
            if p.is_absolute() or ".." in p.parts or "\\" in i.filename or ":" in i.filename:
                self.zip.close()
                raise ValueError("Unsafe IDML package path")
            if i.file_size > 32*1024*1024:
                self.zip.close()
                raise ValueError("IDML member too large")
        self.cache = {}
        self.marker_evidence = {}

    def read(self, name):
        if name not in self.cache:
            data = self.zip.read(name)
            # ElementTree is the parser. Disallow DTD/entity declarations, including UTF-16.
            check = data.replace(b"\x00", b"").upper()
            if b"<!DOCTYPE" in check or b"<!ENTITY" in check:
                raise ValueError("DTD/entities are not allowed")
            self.marker_evidence[name] = pi_evidence(data)
            self.cache[name] = ET.fromstring(data, parser=ET.XMLParser(target=ET.TreeBuilder(insert_pis=True, insert_comments=True)))
        return self.cache[name]


def extract(path):
    package = Package(path)
    try:
        return extract_package(package, hashlib.sha256(Path(path).read_bytes()).hexdigest())
    finally:
        package.zip.close()


def extract_package(pkg, digest):
    doc = pkg.read("designmap.xml")
    model = {"schema": SCHEMA, "schemaVersion": 2, "unit": "pt",
             "metadata": {"sourceFormat": "IDML", "sourceSha256": digest,
                          "domVersion": doc.get("DOMVersion"), "extractorVersion": 2,
                          "contentPrivacy": "Contains original text and link metadata; do not publish automatically"},
             "pages": [], "spreads": [], "elements": [], "stories": [], "threads": [],
             "styles": {"paragraph": [], "character": [], "object": []},
             "fonts": [], "colors": [], "layers": [], "issues": [], "sourceXml": {}}

    # Retain the legacy aid field as well as the PI-preserving XML envelope.
    marker = re.search(r"<\?aid\s[^?]*\?>", pkg.zip.read("designmap.xml").decode("utf-8-sig"))
    if marker:
        model["metadata"]["aidProcessingInstruction"] = marker.group(0)

    def issue(code, ref, detail):
        model["issues"].append({"code": code, "ref": ref, "detail": detail})

    # Follow package references, not filename guesses. Retain unreferenced XML explicitly.
    refs = [(tag(e), e.get("src")) for e in doc.iter() if e.get("src")]
    for _, name in refs:
        pkg.read(name)
    for name in pkg.zip.namelist():
        if name.lower().endswith(".xml"):
            pkg.read(name)
            if name != "designmap.xml" and name not in [r[1] for r in refs]:
                issue("RAW_ONLY_RESOURCE", name, "Preserved XML; not linked by designmap")
    model["sourceXml"] = {name: raw(root) for name, root in pkg.cache.items()}
    model["metadata"]["markerPreservationVersion"] = 1
    model["metadata"]["sourceProcessingInstructions"] = {name: evidence[0] for name, evidence in pkg.marker_evidence.items()}
    for name, tree in model["sourceXml"].items():
        tree["beforeRoot"], tree["afterRoot"] = pkg.marker_evidence[name][1:]
    model["metadata"]["packageInventory"] = [{"name": i.filename, "bytes": i.file_size,
        "preservation": "XML tree" if i.filename in pkg.cache else "source package only"} for i in pkg.zip.infolist()]
    style_map = {}
    for name, root in pkg.cache.items():
        if name == "designmap.xml":
            model["layers"] = [{"id": e.get("Self"), "order": i, "properties": properties(e)}
                               for i, e in enumerate(root.findall("Layer"))]
        for kind, xmltype in [("paragraph", "ParagraphStyle"), ("character", "CharacterStyle"), ("object", "ObjectStyle")]:
            for e in root.iter(xmltype):
                if not e.get("Self"):
                    continue
                item = {"id": e.get("Self"), "name": e.get("Name"), "properties": properties(e),
                        "children": {tag(c): properties(c) for c in e if tag(c) != "Properties"}}
                if item["id"] in style_map:
                    issue("DUPLICATE_STYLE", item["id"], "Cannot resolve unambiguously")
                style_map[item["id"]] = item
                model["styles"][kind].append(item)
        for e in root.iter("Font"):
            model["fonts"].append({"id": e.get("Self"), "family": e.get("FontFamily"),
                                   "style": e.get("FontStyleName"), "postscriptName": e.get("PostScriptName"),
                                   "fullName": e.get("FullName"), "properties": properties(e)})
            if e.find("./Properties/DesignAxesRange") is not None:
                issue("VARIABLE_FONT_AXIS_PRESERVED", e.get("Self"), "Axis ranges preserved; Host reproduction not implemented")
        for typ in ("Color", "Tint", "Gradient", "Swatch"):
            for e in root.iter(typ):
                if e.get("Self"):
                    model["colors"].append({"id": e.get("Self"), "type": typ, "properties": properties(e)})
                    if typ == "Gradient":
                        issue("GRADIENT_PRESERVED_ONLY", e.get("Self"), "Stops preserved in sourceXml")

    def resolve(ref, trail=(), family=None):
        if not ref or ref == "n":
            return {}
        if ref not in style_map and ref.startswith("$ID/"):
            matches = [key for key in style_map if key.endswith("/"+ref)
                       and (family is None or key.startswith(family+"/"))]
            if len(matches) == 1:
                ref = matches[0]
        if ref in trail:
            issue("STYLE_CYCLE", ref, "Cyclic BasedOn reference")
            return {}
        style = style_map.get(ref)
        if not style:
            issue("MISSING_STYLE", ref, "Reference not found; no invented defaults")
            return {}
        return {**resolve(style["properties"].get("BasedOn"), trail+(ref,), ref.split("/")[0]), **style["properties"]}

    for style in style_map.values():
        style["resolvedProperties"] = resolve(style["id"])

    for kind, name in refs:
        if kind != "Story":
            continue
        s = pkg.read(name).find("Story")
        if s is None:
            continue
        story = {"id": s.get("Self"), "properties": properties(s), "paragraphs": []}
        for p in s.findall("ParagraphStyleRange"):
            pp = properties(p)
            effective = {**resolve(pp.get("AppliedParagraphStyle")), **pp}
            paragraph = {"styleRef": pp.get("AppliedParagraphStyle"), "properties": pp,
                         "resolvedProperties": effective, "runs": []}
            for c in p.findall("CharacterStyleRange"):
                cp = properties(c)
                # Keep the complete cascade, as well as a simple-range projection.
                # Nested/GREP styles and contextual composition are not resolved offline.
                resolved = {**effective, **resolve(cp.get("AppliedCharacterStyle")), **cp}
                tokens = [{"type": tag(t), "text": t.text or "", "properties": properties(t)}
                          for t in c if tag(t) != "Properties"]
                for token, element in zip(tokens, (t for t in c if tag(t) != "Properties")):
                    if len(element) or tag(element) in ("#pi", "#comment"):
                        token["contentTree"] = raw(element)
                for t in tokens:
                    if t["type"] not in ("Content", "Br"):
                        issue("COMPLEX_STORY_TOKEN", story["id"], t["type"]+" retained in sourceXml")
                paragraph["runs"].append({"styleRef": cp.get("AppliedCharacterStyle"), "properties": cp,
                                          "resolvedProperties": resolved, "tokens": tokens})
            story["paragraphs"].append(paragraph)
        model["stories"].append(story)
        issue("COMPOSITION_NOT_EXTRACTABLE", story["id"], "IDML has no live line breaks/overset result; InDesign recompose required")

    for kind, name in refs:
        if kind not in ("Spread", "MasterSpread"):
            continue
        spread = pkg.read(name).find(kind)
        if spread is None:
            continue
        sid = spread.get("Self")
        pages = []
        model["spreads"].append({"id": sid, "kind": kind, "properties": properties(spread), "transform": matrix(spread)})
        for page in spread.findall("Page"):
            b = nums(page.get("GeometricBounds"), 4)
            p = {"id": page.get("Self"), "spreadId": sid, "kind": kind,
                 "index": len(model["pages"]), "name": page.get("Name"), "parentRef": page.get("AppliedMaster"),
                 "documentIndex": sum(x["kind"] == "Spread" for x in model["pages"]) if kind == "Spread" else None,
                 "width": b[3]-b[1], "height": b[2]-b[0], "bounds": b, "transform": matrix(page),
                 "properties": properties(page)}
            model["pages"].append(p)
            pages.append(p)
        if kind == "MasterSpread":
            issue("PARENT_PRESERVED_ONLY", sid, "Parent application/overrides not regenerated in Phase 1")

        def visit(parent, parent_id=None, parent_transform=IDENTITY):
            for order, e in enumerate(parent):
                if tag(e) not in ITEMS:
                    if e.get("Self") and tag(e) not in ("Page", "Image", "PDF", "EPS"):
                        issue("UNMODELED_SPREAD_OBJECT", e.get("Self"), tag(e)+" retained in sourceXml only")
                    continue
                eid = e.get("Self")
                transform = compose(parent_transform, matrix(e))
                paths = []
                for path in e.findall("./Properties/PathGeometry/GeometryPathType"):
                    paths.append({"open": path.get("PathOpen") == "true", "points": [
                        {k: nums(p.get(k), 2) for k in ("Anchor", "LeftDirection", "RightDirection")}
                        for p in path.findall("./PathPointArray/PathPointType")]})
                anchors = [point(transform, p["Anchor"]) for path in paths for p in path["points"]]
                candidates = []
                page_bounds = {}
                for p in pages:
                    local = [point(inverse(p["transform"]), a) for a in anchors]
                    b = box([[a[0]-p["bounds"][1], a[1]-p["bounds"][0]] for a in local])
                    if b and b[3] >= 0 and b[1] <= p["width"] and b[2] >= 0 and b[0] <= p["height"]:
                        candidates.append(p["id"])
                        page_bounds[p["id"]] = b
                label = e.get("Label")
                if label is None:
                    label = e.findtext("./Properties/Label")
                roles = {"TITLE": "title", "SUBTITLE": "subtitle", "BODY": "body", "HERO_IMAGE": "image1",
                         "IMAGE_1": "image1", "IMAGE_2": "image2", "HEADER": "header", "FOOTER": "footer", "PAGE_NUMBER": "pageNumber", "CAPTION": "caption"}
                role = roles.get((label or "").strip().upper())
                ep = properties(e)
                pref = e.find("TextFramePreference")
                item = {"id": eid, "type": tag(e), "spreadId": sid, "groupId": parent_id,
                        "layerRef": e.get("ItemLayer"), "sourceOrder": order,
                        "pageCandidates": candidates, "pageAssignment": "derived-overlap",
                        "pageBounds": page_bounds, "transform": matrix(e), "spreadTransform": transform,
                        "paths": paths, "anchorBounds": box(anchors), "visibleBounds": None,
                        "properties": ep, "objectStyleRef": e.get("AppliedObjectStyle"),
                        "role": {"confirmed": role, "source": "script-label" if role else None, "label": label,
                                 "candidates": [], "needsConfirmation": not bool(role)},
                        "textFrame": {"properties": properties(pref) if pref is not None else {},
                                      "storyRef": e.get("ParentStory"), "previousRef": e.get("PreviousTextFrame"),
                                      "nextRef": e.get("NextTextFrame")} if tag(e) == "TextFrame" else None,
                        "details": {tag(c): detail_properties(c) for c in e if tag(c) in
                                    ("TextWrapPreference", "TransparencySetting", "FrameFittingOption", "AnchoredObjectSetting")},
                        "image": [{"type": tag(c), "properties": properties(c),
                                   "details": {tag(child): detail_properties(child) for child in c if tag(child) != "Properties"}}
                                  for c in e if tag(c) in ("Image", "PDF", "EPS")],
                        "capability": "preserved; reproduction requires explicit projection"}
                model["elements"].append(item)
                if len(candidates) != 1 and tag(e) != "Group":
                    issue("PAGE_ASSIGNMENT_REVIEW", eid, "No unique overlapping page; no guessed parentPage")
                if e.get("AppliedObjectStyle"):
                    resolve(e.get("AppliedObjectStyle"))
                    issue("OBJECT_STYLE_REVIEW", eid, "Enable flags/inheritance retained, not flattened into guessed defaults")
                issue("VISIBLE_BOUNDS_UNAVAILABLE", eid, "Anchor bounds are not Bezier extrema or stroke-inclusive visibleBounds")
                if tag(e) != "TextFrame":
                    issue("GRAPHIC_PRESERVED_ONLY", eid, tag(e)+" reproduction deferred")
                visit(e, eid, transform)
        visit(spread)

    elements = {e["id"]: e for e in model["elements"]}
    stories = {s["id"] for s in model["stories"]}
    for e in model["elements"]:
        tf = e["textFrame"]
        if not tf:
            continue
        model["threads"].append({"frameRef": e["id"], **{k: tf[k] for k in ("storyRef", "previousRef", "nextRef")}})
        if tf["storyRef"] not in stories:
            issue("MISSING_STORY", e["id"], "Story reference cannot be resolved")
        for key, back in (("nextRef", "previousRef"), ("previousRef", "nextRef")):
            ref = tf[key]
            if ref and ref != "n":
                other = elements.get(ref, {}).get("textFrame")
                if not other or other["storyRef"] != tf["storyRef"] or other[back] != e["id"]:
                    issue("BROKEN_THREAD", e["id"], key+"="+ref)
    model["capabilities"] = {"extraction": "partial-semantic/full-XML-preservation",
                             "hostReproduction": "explicit text proof only; not a full document clone",
                             "preview": "text proof approximation; no InDesign composition",
                             "unsupported": ["live overset/visibleBounds", "nested/GREP style resolution", "complex story tokens",
                                             "group/Parent reconstruction", "image/graphics reconstruction", "full stacking order",
                                             "object-style inheritance evaluation", "Korean composer reproduction"]}
    return model


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.source.suffix.lower() != ".idml":
        parser.error("Use an IDML exported by InDesign; INDD binaries are not parsed")
    result = extract(args.source)
    # Exclusive creation: never overwrite an original, prior model, or unrelated file.
    with args.output.open("x", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, allow_nan=False)
    print(json.dumps({"pages": len(result["pages"]), "elements": len(result["elements"]),
                      "stories": len(result["stories"]), "issues": len(result["issues"])}))


if __name__ == "__main__":
    main()
