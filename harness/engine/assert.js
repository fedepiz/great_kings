// =====================================================================
// assert.js — the three lines every suite in this directory had its own copy of
// =====================================================================
// Ten suites, ten transcriptions of a counter, a tick-or-cross, and an exit code. They were
// close but not identical: one printed a detail on failure and the others could not, and
// test-orders.js had drifted to
//
//     process.exit(fail ? 0 : 0);
//
// which exits 0 whatever happens. That suite is the regression test for the whole command
// layer — 1052 round-trips — and for as long as that line stood, a failure in it would have
// been reported to run-all.sh as a pass. The suite was green, so nothing pointed at it.
//
// A copy that drifts silently is the argument for not keeping copies. `run-all.sh` greps for
// the "N passed," line, so that wording is load-bearing; keep it.
// =====================================================================
module.exports = function suite() {
  let pass = 0, fail = 0;
  // `detail` is printed under a failure — a diff, a count, the offending command.
  const ok = (c, m, detail) => {
    if (c) { pass++; console.log("  ✓", m); }
    else { fail++; console.log("  ✗ FAIL:", m, detail ? "\n      " + detail : ""); }
  };
  const done = () => {
    console.log(`\n${pass} passed, ${fail} failed\n`);
    process.exit(fail ? 1 : 0);
  };
  return { ok, done };
};
