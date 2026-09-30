"""Fidelity checks against a hand-authored, non-proprietary IDML package fixture."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from extract_design import extract, compose, inverse, point, Package

FIXTURE = Path(__file__).parent / "fixtures/design-model-idml"


def fixture(path, transform=None):
    with zipfile.ZipFile(path, "w") as z:
        for f in FIXTURE.rglob("*.xml"):
            name = f.relative_to(FIXTURE).as_posix()
            text = f.read_text(encoding="utf-8")
            z.writestr(name, transform(name, text) if transform else text)


class Extraction(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "source.idml"
        fixture(self.path)
        self.model = extract(self.path)

    def test_document_processing_instruction_preserved_outside_element_tree(self):
        marker = '<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="21.4(7)"?>'
        fixture(self.path, lambda name, text: text.replace("<Document", marker + "<Document", 1) if name == "designmap.xml" else text)
        self.assertEqual(extract(self.path)["metadata"]["aidProcessingInstruction"], marker)

    def test_geometry_in_points_and_page_coordinate_system(self):
        m = self.model
        self.assertEqual(m["unit"], "pt")
        self.assertEqual(m["pages"][0]["width"], 600)
        e = m["elements"][0]
        self.assertEqual(e["pageCandidates"], ["p1"])
        self.assertEqual(e["pageBounds"]["p1"], [30, 20, 130, 420])
        self.assertIsNone(e["visibleBounds"])

    def test_typography_inheritance_and_local_run_override(self):
        r = self.model["stories"][0]["paragraphs"][0]["runs"]
        p = r[0]["resolvedProperties"]
        self.assertEqual([p[k] for k in ["AppliedFont", "FontStyle", "PointSize", "Leading", "Tracking"]], ["Design Test", "9 Black", 51, 54, -20])
        self.assertEqual(p["SpaceAfter"], 11.338582677165356)
        self.assertEqual(p["Composer"], "HL Composer")
        self.assertEqual(p["KinsokuType"], "KinsokuPushInFirst")
        self.assertEqual(r[1]["resolvedProperties"]["Tracking"], -25)
        self.assertTrue(r[1]["resolvedProperties"]["Underline"])

    def test_styles_fonts_content_and_roles_preserved(self):
        m = self.model
        self.assertEqual(m["fonts"][0]["properties"]["Status"], "Substituted")
        self.assertEqual(m["fonts"][0]["postscriptName"], "DesignTest-Black")
        self.assertEqual(m["elements"][0]["role"]["confirmed"], "title")
        self.assertIsNone(m["elements"][2]["role"]["confirmed"])
        self.assertEqual(m["stories"][0]["paragraphs"][0]["styleRef"], "ParagraphStyle/title")
        self.assertIn("& typography", m["stories"][0]["paragraphs"][0]["runs"][0]["tokens"][0]["text"])

    def test_frame_insets_columns_and_baseline_in_style(self):
        p = self.model["styles"]["object"][0]["children"]["TextFramePreference"]
        self.assertEqual(p["InsetSpacing"], [3, 4, 5, 6])
        self.assertEqual(p["TextColumnGutter"], 12)
        self.assertEqual(p["FirstBaselineOffset"], "AscentOffset")
        self.assertEqual(self.model["elements"][0]["textFrame"]["properties"], {"TextColumnCount": 2})

    def test_image_group_color_and_unsupported_retained(self):
        m = self.model
        photo = m["elements"][2]
        self.assertEqual(photo["groupId"], "group1")
        self.assertEqual(photo["spreadTransform"], [1, 0, 0, 1, 30, -70])
        self.assertEqual(photo["pageBounds"]["p2"], [330, 30, 410, 130])
        self.assertEqual(photo["image"][0]["properties"]["ItemTransform"], "2 0 0 2 -5 -6")
        self.assertEqual(photo["details"]["FrameFittingOption"]["LeftCrop"], 2)
        self.assertEqual(photo["image"][0]["details"]["ClippingPathSettings"]["ClippingType"], "AlphaChannel")
        source = json.dumps(m["sourceXml"])
        self.assertIn("FillProportionally", source)
        self.assertIn("AlphaChannel", source)
        self.assertEqual(m["colors"][0]["properties"]["Space"], "CMYK")
        self.assertTrue(any(i["code"] == "GRADIENT_PRESERVED_ONLY" for i in m["issues"]))

    def test_missing_style_report_not_default(self):
        fixture(self.path, lambda n, t: t.replace('AppliedParagraphStyle="ParagraphStyle/title"', 'AppliedParagraphStyle="missing"'))
        m = extract(self.path)
        self.assertTrue(any(i["code"] == "MISSING_STYLE" for i in m["issues"]))
        self.assertNotIn("PointSize", m["stories"][0]["paragraphs"][0]["runs"][0]["resolvedProperties"])

    def test_broken_thread_and_style_cycle_reported(self):
        fixture(self.path, lambda n,t: t.replace('NextTextFrame="n"','NextTextFrame="missing"').replace('>ParagraphStyle/base</BasedOn>', '>ParagraphStyle/title</BasedOn>'))
        codes = {i["code"] for i in extract(self.path)["issues"]}
        self.assertTrue({"BROKEN_THREAD", "STYLE_CYCLE"} <= codes)

    def test_affine_inverse_round_trip(self):
        a = [0, 2, -3, 0, 15, 23]
        self.assertEqual(point(inverse(a), point(a, [7, 8])), [7, 8])
        self.assertEqual(compose(a, inverse(a)), [1, 0, 0, 1, 0, 0])

    def test_entities_rejected(self):
        fixture(self.path, lambda n,t: '<!DOCTYPE d [<!ENTITY x "bad">]>'+t if n.endswith('Styles.xml') else t)
        with self.assertRaisesRegex(ValueError, "DTD"):
            extract(self.path)

    def test_zip_path_traversal_rejected(self):
        with zipfile.ZipFile(self.path, "a") as z:
            z.writestr("../private.xml", "<bad/>")
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            extract(self.path)

    def test_missing_reference_stops_extraction_without_partial_output(self):
        fixture(self.path, lambda n,t:t.replace('Resources/Fonts.xml', 'Resources/Absent.xml'))
        with self.assertRaises(KeyError):
            extract(self.path)

    def test_repeat_extraction_no_mutation(self):
        before = self.path.read_bytes()
        self.assertEqual(self.model, extract(self.path))
        self.assertEqual(before, self.path.read_bytes())

    def test_builtin_style_short_reference_resolves_within_kind(self):
        fixture(self.path, lambda n,t:t.replace('ParagraphStyle/base','ParagraphStyle/$ID/base').replace('>ParagraphStyle/$ID/base</BasedOn>', '>$ID/base</BasedOn>'))
        m = extract(self.path)
        self.assertFalse(any(i["code"] == "MISSING_STYLE" for i in m["issues"]))
        self.assertEqual(m["stories"][0]["paragraphs"][0]["runs"][0]["resolvedProperties"]["SpaceAfter"], 11.338582677165356)

    def test_graphic_bounds_attributes_and_image_details_are_not_empty_strings(self):
        fixture(self.path, lambda n,t:t.replace('<Image Self="image1" ItemTransform="2 0 0 2 -5 -6">', '<Image Self="image1" ItemTransform="2 0 0 2 -5 -6"><Properties><GraphicBounds Left="0" Top="0" Right="2551" Bottom="3579"/></Properties>'))
        m = extract(self.path)
        image = m["elements"][2]["image"][0]
        self.assertEqual(image["properties"]["GraphicBounds"], {"Left": 0, "Top": 0, "Right": 2551, "Bottom": 3579})
        self.assertFalse(any(i["code"] == "UNMODELED_SPREAD_OBJECT" and i["ref"] == "image1" for i in m["issues"]))

    def test_variable_font_nested_axis_lists_preserved(self):
        fixture(self.path, lambda n,t:t.replace('Status="Substituted"/>', 'Status="Substituted"><Properties><DesignAxesRange type="list"><ListItem type="list"><ListItem type="double">200</ListItem><ListItem type="double">900</ListItem></ListItem></DesignAxesRange></Properties></Font>'))
        m = extract(self.path)
        self.assertEqual(m["fonts"][0]["properties"]["DesignAxesRange"], [[200, 900]])
        self.assertTrue(any(i["code"] == "VARIABLE_FONT_AXIS_PRESERVED" for i in m["issues"]))


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--model":
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/"fixture.idml"
            fixture(p)
            print(json.dumps(extract(p), ensure_ascii=True))
    else:
        unittest.main()
