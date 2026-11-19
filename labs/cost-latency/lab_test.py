import unittest

from lab import Budget, Meter, Step, TaskResult, Usage, call_cost, cost_per_completed_task, run_task

MAIN = Usage(input_tokens=2_000, cache_read_input_tokens=10_000, output_tokens=800)
SMALL = Usage(input_tokens=600, output_tokens=20)


class CostLabTest(unittest.TestCase):
    def test_worked_example_from_the_lesson(self):
        self.assertAlmostEqual(call_cost("large", MAIN), 0.021)
        self.assertAlmostEqual(call_cost("small", SMALL), 0.000175)

    def test_cache_reads_are_cheaper_than_uncached_input(self):
        uncached = call_cost("large", Usage(input_tokens=12_000, output_tokens=800))
        self.assertAlmostEqual(uncached - call_cost("large", MAIN), 0.027)

    def test_cache_write_premium_depends_on_ttl(self):
        five = call_cost("large", Usage(cache_creation_input_tokens=1_000_000))
        hour = call_cost("large", Usage(cache_creation_input_tokens=1_000_000, cache_ttl="1h"))
        self.assertEqual((five, hour), (3.75, 6.0))

    def test_task_completes_within_budget(self):
        meter = Meter(Budget(per_task=0.05, per_user_day=1.00))
        result = run_task("t1", "ana", [Step("small", SMALL, SMALL), Step("large", MAIN, MAIN)], meter)
        self.assertEqual(result.status, "completed")
        self.assertAlmostEqual(result.cost, 0.021175)
        self.assertAlmostEqual(meter.user_spend["ana"], 0.021175)

    def test_task_stops_gracefully_before_breaking_its_budget(self):
        meter = Meter(Budget(per_task=0.05, per_user_day=1.00))
        steps = [Step("large", MAIN, MAIN), Step("large", MAIN, MAIN), Step("large", MAIN, MAIN)]
        result = run_task("t2", "ana", steps, meter)
        self.assertEqual((result.status, result.calls, result.stopped_by), ("budget_stop", 2, "task budget"))
        self.assertLessEqual(result.cost, 0.05)

    def test_daily_user_budget_applies_across_tasks(self):
        meter = Meter(Budget(per_task=1.00, per_user_day=0.03))
        run_task("a", "ben", [Step("large", MAIN, MAIN)], meter)
        result = run_task("b", "ben", [Step("large", MAIN, MAIN)], meter)
        self.assertEqual(result.stopped_by, "daily user budget")

    def test_cost_per_completed_task_includes_wasted_spend(self):
        results = [TaskResult("completed", 0.02, 2), TaskResult("budget_stop", 0.05, 3), TaskResult("completed", 0.02, 2)]
        self.assertAlmostEqual(cost_per_completed_task(results), 0.045)


if __name__ == "__main__":
    unittest.main()
