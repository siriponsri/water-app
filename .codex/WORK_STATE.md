# Work State

## Objective
Replace Owner-only repository verification with a repeatable local automatic gate, while keeping live deployment checks read-only and honestly separated.

## Verified Facts
- Release stamp is `7.1aa`; branch is `main`; product checkpoint `eaa7973` is on both `main` and `origin/main` before the final documentation refresh.
- The local gate reports `23 PASS`, `0 FAIL`, and `3 NOT_TESTED`; `deterministicLocalPass=true`; all three evidence classes are present.
- Final aggregate live smoke completed all 18 configured Water/Air/CV scopes with zero failures after the Owner redeployed Water and Air.
- Root cause was the double-escaped whitespace regex in the active Water/Air tokenizers; local source is now corrected and source-executed matcher tests pass.

## Completed
- Re-ran the full local gate with the isolated PDF service on port `8011`.
- Rewrote the post-deployment report with execution, inspection, live smoke, and Owner-gate evidence.
- Updated `docs/OUTPUT.md` and `validation/POST_DEPLOYMENT_VALIDATION_7.1v.md` with the final automated and live evidence.
- Closed completed hostile-review agents; no production system was mutated.
- Expanded deployment smoke to aggregate every scope and preserve all pass/fail evidence.
- Corrected `google/app-scripts/RPP2-water-record.gs` and `google/app-scripts/RPP2-air-record.gs` tokenization.

## Files Intentionally Changed
- Product and validation changes already present in the working tree under `apps/web/src/`, `js/`, `server/`, `START-ANF3.bat`, and `validation/`.
- Documentation: `docs/OUTPUT.md`, `validation/POST_DEPLOYMENT_VALIDATION_7.1v.md`.
- Coordination: `.agent-bus/` files; keep out of the product release snapshot unless explicitly requested.

## Tests Passed
- `rtk node validation/run_local_validation.mjs` with `ANF3_RUN_LOCAL_ARTIFACTS=1` and `ANF3_ARTIFACT_SERVER=http://127.0.0.1:8011`.
- 15 frontend files / 107 tests; 28 server tests; seven route artifacts; seven route browser smoke.

## Tests Failed
- NONE in the final local and live read-only validation. The pre-redeploy mixed-building observation and one transient 404 were resolved by redeployment and retry.

## Remaining
- Run target-machine copy-down/launcher, converter, and visual acceptance gates.
- Include `luna-overnight.log` in the owner-authorized checkpoint; generated `output/`, `words/`, and `pdfs/` remain excluded.
- Review the complete staged plus unstaged diff before the owner-authorized commit/push.

## Blockers
- NONE for the source branch. Target-machine and Owner visual gates remain external `NOT_TESTED` evidence and are not claimed as PASS.

## Exact Next Action
Commit and push all current files except `.gitignore` under the owner's explicit authorization.
