# OWNER VISUAL CHECK — ITERATION 5

## Safety
- These are synthetic/local audit records only; no production Sheets or Apps Script deployment is involved.
- Open each DOCX and PDF pair side by side. Do not edit authoritative files under `templates/`.

## Checklist for Every Pair
- [ ] Correct form/template and page count
- [ ] Header, worksheet number, and sample row are readable
- [ ] Thai/English text is intact
- [ ] No literal `<placeholder>` remains
- [ ] No clipping, shifted table, missing border, or unexpected page
- [ ] PDF visually corresponds to DOCX

## Pairs

### PW/PRW
- DOCX: `words/pw-prw/AUDIT-I4-PW.docx`
- PDF: `pdfs/pw-prw/3626ec46e6ef8e2c2848ae02eaf1a3891419082bacbcb1fda15f6db603e05393.pdf`
- Confirm: `TNTC`, whole-number results, no unresolved placeholders.

### WFI/PUS
- DOCX: `words/wfi-pus/AUDIT-I4-WFI.docx`
- PDF: `pdfs/wfi-pus/3b23393f5ef7b459fc682fd0ed1d202badb465be0b050b18d9af7c9904142a62.pdf`
- Confirm: result is in the WFI result column and is whole-number formatted.

### Environmental Monitoring
- DOCX: `words/em-air/AUDIT-I4-EM.docx`
- PDF: `pdfs/em-air/1ae75ec0b3fd4a71e60037b8c70f902e128935cf0e5132e6d6bef5c55e364def.pdf`
- Confirm: `01 Sep 2026`, whole-number temperature/RH/result, 50-row layout intact.

### Compressed Air
- DOCX: `words/compressed-air/AUDIT-I4-CA.docx`
- PDF: `pdfs/compressed-air/4bd4a78a2f572b6802136522f3c9c7cf6d3f1e984314f00abc35356a0966dca2.pdf`
- Confirm: record temperature occupies only `tempRoom01`; per-sample values are whole-number formatted.

### CV Contact
- DOCX: `words/cleaning-validation-contact/AUDIT-I4-CVC.docx`
- PDF: `pdfs/cleaning-validation-contact/f148365b7c6f76645b3a55ab487d2e5ce98dd2c78b4841313bf0fa177aca4393.pdf`
- Confirm: `gradeControl = D`, date `01 Sep 2026`, point `Filler - Needle 1`, no literal `<gradeControl>`.

### CV Rinse — Pour Plate
- DOCX: `words/cleaning-validation-rinse-pour/AUDIT-I4-CVP.docx`
- PDF: `pdfs/cleaning-validation-rinse-pour/8935f58b133143f27d473716d8e7bc7f720b0230ea6f19b40c212aa048af9651.pdf`
- Confirm: `Tank 1` appears in Tag No.; Sampling Point and all result fields are blank.

### CV Rinse — Membrane Filtration
- DOCX: `words/cleaning-validation-rinse-membrane/AUDIT-I4-CVM.docx`
- PDF: `pdfs/cleaning-validation-rinse-membrane/5b8a07d1ec53dbb287acadd79e3cc137a3540500c941cb7f927082ae3d18ef9e.pdf`
- Confirm: `Line 3` appears in Tag No.; Sampling Point and result are blank.

## Owner Result
- Overall: PASS / FAIL
- Failed pair(s):
- Observation(s):
- Checked by/date:
