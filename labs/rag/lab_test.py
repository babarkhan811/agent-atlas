import unittest

from lab import HANDBOOK, build_prompt, check_citations, chunk, retrieve

CHUNKS = chunk("handbook", HANDBOOK, size=20, overlap=5)


class RagLabTest(unittest.TestCase):
    def test_chunks_overlap_and_cover_the_text(self):
        self.assertGreater(len(CHUNKS), 1)
        first, second = CHUNKS[0].text.split(), CHUNKS[1].text.split()
        self.assertEqual(first[-5:], second[:5])
        self.assertIn("finance portal.", CHUNKS[-1].text)

    def test_retrieves_the_parental_leave_passage_first(self):
        hits = retrieve(CHUNKS, "How many weeks of parental leave do I get?")
        self.assertIn("16 weeks", hits[0][0].text)
        self.assertEqual([s for _, s in hits], sorted((s for _, s in hits), reverse=True))

    def test_threshold_drops_irrelevant_passages(self):
        self.assertEqual(retrieve(CHUNKS, "What is the office wifi password?", min_score=0.2), [])

    def test_prompt_contains_ids_and_grounding_rule(self):
        hits = retrieve(CHUNKS, "parental leave weeks")
        prompt = build_prompt("parental leave weeks", hits)
        self.assertIn(f"[{hits[0][0].id}]", prompt)
        self.assertIn("say you don't know", prompt)

    def test_citation_checks(self):
        hits = retrieve(CHUNKS, "parental leave weeks", k=2)
        good = hits[0][0].id
        self.assertEqual(check_citations(f"16 weeks [{good}].", hits), [])
        self.assertEqual(check_citations("16 weeks.", hits), ["answer has no citations"])
        self.assertEqual(check_citations("16 weeks [handbook#99].", hits), ["cites handbook#99 which was not retrieved"])


if __name__ == "__main__":
    unittest.main()
