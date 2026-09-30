"""Opt-in private source fidelity check; no proprietary fixture is committed.
Run with one or more original IDML paths. Read-only; outputs counts, not content.
"""
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"tools"))
from extract_design import extract


def verify(path):
    before = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    model = extract(path)
    checks = {"pages": 0, "frames": 0, "runs": 0, "typographyValues": 0, "imageBounds": 0}
    with zipfile.ZipFile(path) as z:
        doc = ET.fromstring(z.read("designmap.xml"))
        refs = [(e.tag.split("}")[-1], e.get("src")) for e in doc.iter() if e.get("src")]
        pages = {p["id"]: p for p in model["pages"]}
        frames = {e["id"]: e for e in model["elements"]}
        stories = {s["id"]: s for s in model["stories"]}
        for kind, name in refs:
            root = ET.fromstring(z.read(name))
            if kind in ("Spread", "MasterSpread"):
                for p in root.iter("Page"):
                    bounds = list(map(float, p.get("GeometricBounds").split()))
                    target = pages[p.get("Self")]
                    assert target["bounds"] == bounds
                    assert target["width"] == bounds[3]-bounds[1]
                    assert target["height"] == bounds[2]-bounds[0]
                    checks["pages"] += 1
                for e in root.iter():
                    if e.get("Self") not in frames:
                        continue
                    target = frames[e.get("Self")]
                    assert target["transform"] == list(map(float, e.get("ItemTransform", "1 0 0 1 0 0").split()))
                    anchors = [list(map(float, p.get("Anchor").split())) for p in e.findall("./Properties/PathGeometry/GeometryPathType/PathPointArray/PathPointType")]
                    assert anchors == [p["Anchor"] for path in target["paths"] for p in path["points"]]
                    if e.tag == "TextFrame":
                        for attr,key in [("ParentStory","storyRef"),("PreviousTextFrame","previousRef"),("NextTextFrame","nextRef")]:
                            assert target["textFrame"][key] == e.get(attr)
                    checks["frames"] += 1
                    for i,image in enumerate(e.findall("Image")):
                        bounds=image.find("./Properties/GraphicBounds")
                        if bounds is not None:
                            assert target["image"][i]["properties"]["GraphicBounds"] == {k:float(v) for k,v in bounds.attrib.items()}
                            checks["imageBounds"] += 1
            if kind == "Story":
                for s in root.findall("Story"):
                    target=stories[s.get("Self")]
                    for pi,p in enumerate(s.findall("ParagraphStyleRange")):
                        for ri,r in enumerate(p.findall("CharacterStyleRange")):
                            run=target["paragraphs"][pi]["runs"][ri]
                            assert run["styleRef"] == r.get("AppliedCharacterStyle")
                            assert [t.text or "" for t in r if t.tag == "Content"] == [t["text"] for t in run["tokens"] if t["type"] == "Content"]
                            for key in ["PointSize","Tracking","HorizontalScale","VerticalScale","BaselineShift"]:
                                if key in r.attrib:
                                    assert run["resolvedProperties"][key] == float(r.get(key))
                                    checks["typographyValues"] += 1
                            for key in ["AppliedFont","Leading"]:
                                source=r.find("./Properties/"+key)
                                if source is not None and source.text:
                                    value=float(source.text) if source.get("type")=="unit" else source.text
                                    assert run["resolvedProperties"][key] == value
                                    checks["typographyValues"] += 1
                            checks["runs"] += 1
    assert checks["pages"] == len(model["pages"])
    assert checks["frames"] == len(model["elements"])
    assert not any(i["code"] == "MISSING_STYLE" for i in model["issues"])
    assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == before
    return {"sha256": before, "passed": True, "checks": checks}


if __name__ == "__main__":
    if len(sys.argv)<2:
        raise SystemExit("Provide original IDML paths")
    for source in sys.argv[1:]:
        print(json.dumps(verify(source)))
