# ANF3 Post-Deployment Validation

## Environment

- Repository: `water-app`
- Validation date: 2026-09-11 (Asia/Bangkok)
- Source release: `7.1aa` (`VERSION.txt`, `RELEASE.txt`)
- Local frontend: Vite on `http://127.0.0.1:5173`
- Local document service: isolated current-worktree service on `http://127.0.0.1:8011`
- Artifact inputs: synthetic QA fixtures only; no production records or controlled owner documents
- Scope: automatic local validation plus read-only live endpoint observation

## Commit / Branch

- Branch: `main`
- Current repository commit at validation start: `27dc6cb`
- `origin/main` matched the local commit before this handoff.
- Product changes were present in a mixed staged/unstaged working tree during validation; the final release snapshot must include the complete reviewed diff, not only the staged index.
- Runtime coordination files, `OVERNIGHT_LUNA.md`, the temporary `luna-overnight.log`, and ignored generated outputs are not release artifacts.

## Verified by Execution

The single automated entry point was run with the isolated current-worktree PDF service:

```powershell
$env:ANF3_RUN_LOCAL_ARTIFACTS='1'
$env:ANF3_ARTIFACT_SERVER='http://127.0.0.1:8011'
rtk node validation/run_local_validation.mjs
```

Result: `23 PASS`, `0 FAIL`, `3 NOT_TESTED`; `deterministicLocalPass=true`. The machine-readable result is `output/validation-report.json` (ignored by Git). Its result set contains all three evidence classes: `VERIFIED_BY_REPOSITORY_INSPECTION`, `VERIFIED_BY_EXECUTION`, and `NOT_TESTED`.

Passed local checks include:

- frontend unit tests: 15 files, 107 tests;
- TypeScript check and production build;
- server tests: 28 passed;
- launcher health, converter, and lock-race contracts;
- legacy CV/EM/Compressed Air mappings and blank-value contracts;
- Air pagination, Apps Script security, CV routing, worksheet numbering, and Games freeze contracts;
- interaction, style, frontend/server wiring, non-game, release, Python compilation, and whitespace checks;
- deployment fixture negatives for invalid URLs, repeated/unterminated cursors, mixed buildings, and `Other` source text;
- seven-route document artifacts and seven-route browser smoke.

The local document gate generated and inspected non-empty DOCX/PDF pairs for:
`pw-prw`, `wfi-pus`, `em-air`, `compressed-air`, CV Contact Plate, CV Rinse Pour Plate, and CV Rinse Membrane Filtration. All generated documents had zero unresolved placeholders, retained worksheet identity, and all rendered PDF pages were inspected. The artifact manifest records the actual PDF page counts and route/template checks.

The browser gate covered all seven print routes plus Fill-in-before-Generate, no pre-generation PDF request, one explicit generation request, DOM leakage, focus/keyboard, URL/detail, responsive, and dark-theme checks.

## Verified by Inspection

- The active Apps Script source excludes Building 10/12/16 from logical `Other` matching at `google/app-scripts/RPP2-water-record.gs:826`.
- The local deployment validator uses complete building-token matching, rejects mixed-building responses, enforces cursor termination, validates the success envelope/meta in live mode, and accepts only strict HTTPS Google Apps Script `/exec` URLs.
- The frontend keeps logical domain/building requests and defensively filters returned summaries before display.
- Legacy aliases and blank-missing-value behavior remain internal compatibility contracts; user-facing screens do not expose raw placeholder or payload-key names.
- Generated output identity remains `<worksheetNo>.docx` and `<worksheetNo>.pdf`; no production files were written.

## Defects Found

- **Blocking live deployment mismatch:** read-only Water `pw-prw` with `building=Other` returned at least one item whose building was `Building 12`. This contradicts the checked-in Apps Script filter and fails the building-isolation acceptance criterion.
- The live smoke stopped at that failure, so complete live traversal and live cursor termination were not proven for all remaining Water cases.
- An installed/copy-down launch and Owner visual sign-off were not executed in this environment.

## Defects Fixed

- Added the repeatable `validation/run_local_validation.mjs` gate with machine-readable results and explicit evidence classes.
- Added deterministic launcher identity/converter/lock-race tests.
- Restored active legacy CV aliases and blank missing laboratory values in EM/Compressed Air paths.
- Added capacity-aware self-contained React document pages and over-capacity regression coverage.
- Added populated seven-route DOCX/PDF validation and all-route browser smoke.
- Added strict deployment URL, cursor, building-isolation, and CV fixture coverage.
- Added rollback cleanup fault coverage for remove/unlink failure paths.
- Preserved the real live mismatch as a release blocker; no production code or data was changed to hide it.

## Tests Passed / Failed

- Passed: the complete deterministic local gate, `23` checks.
- Passed: all focused frontend, server, launcher, mapping, routing, artifact, browser, and static contract checks listed above.
- Failed: live Water `pw-prw` `Other` building-isolation check; the observed live response included `Building 12`.
- Not a local implementation failure: the live mismatch requires Owner-controlled Apps Script deployment/version investigation.

## Not Tested

- Actual Apps Script New Version deployment or redeployment.
- Approved non-production Sheets end-to-end data validation.
- Target laboratory PC copy-down and first launch through `START-ANF3.bat`.
- Interactive target-PC converter/Word/LibreOffice behavior and clean-PC/UNC launch.
- Actual request-timeout interruption; timeout handling is implemented but no live request exceeded the configured timeout.
- Owner seven-route visual sign-off and target display-scale/axe audit.

## Production Read-Only Smoke

- Only read-only GET search requests were used; no record, Sheet, deployment, permission, or external document was mutated.
- Water WFI, Air EM, Air Compressed Air, and CV spot responses were schema-valid with the expected domain/workflow metadata and matching records where reached.
- Water pagination advanced from cursor `MQ` to `Mg` during the observed read-only run.
- Water `pw-prw` `Other` failed isolation because a `Building 12` item was returned. This is evidence of a deployed-code/configuration mismatch, not permission to deploy or edit Production.
- Required Owner action: inspect the deployed Water `/exec` revision and deploy the checked-in source as a new version if appropriate, then rerun the same read-only smoke command. Do not treat the local fixture PASS as live deployment proof.

## Files Changed

- Product/runtime: `START-ANF3.bat`, `apps/web/src/`, `js/`, `server/pdf_server.py`, `server/tests/`.
- Automated validation: `validation/run_local_validation.mjs`, `validation/test_legacy_document_mapping.mjs`, `validation/fixtures/deployment-smoke.json`, `validation/test_deployment_smoke.mjs`, `validation/validate_browser_smoke.mjs`, `validation/validate_deployment_smoke.mjs`, `validation/validate_document_artifacts.py`, `validation/validate_launchers.mjs`.
- Release/docs: `VERSION.txt`, `RELEASE.txt`, `.gitignore`, `docs/OUTPUT.md`, and this report.
- Coordination files were updated separately and are not part of the product release snapshot.

## Residual Risks

- Live Water building isolation remains a blocking acceptance risk until the deployed revision is corrected and read-only smoke passes.
- The package metadata remains `7.1.0` while the application release stamp is `7.1aa`; this is not used as the user-facing release identity and should be kept intentional or reconciled in a separate release decision.
- Target-machine behavior, controlled owner templates, and visual sign-off remain outside the local automated proof.

## Owner Tests Required on Workstation

1. In the approved Apps Script project, verify the deployed Water revision and use `Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy` only after confirming the checked-in source and configuration.
2. Rerun the read-only validator with the approved Water, Air, and CV `/exec` URLs. Require zero mixed-building records and safe cursor termination.
3. Copy the release to a clean target PC, launch through `START-ANF3.bat`, verify `/api/status` and converter health, and exercise all seven routes.
4. Run the seven-route visual checklist at the target display scale, including login centering, dark mode, keyboard focus, Fill-in state, conflict confirmation, and generated document correspondence.

## Recommendation

`NOT_READY_FOR_ACCEPTANCE`: the detailed local automatic gate is green and replaces Owner execution for the repository-testable behaviors, but the observed live Water `Other` isolation mismatch is a blocking external deployment defect. Keep the branch available for Owner investigation and do not claim final release acceptance until the read-only live smoke passes.
