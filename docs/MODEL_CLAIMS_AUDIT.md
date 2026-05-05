# Model Claims Audit

## Current Status

Production World Engine: Not active yet
Verified 9,500-game backtest: Not available yet
9500 recorded events claim: unsupported
Source of unsupported claim: hardcoded constants in frontend/app/components/LabPage.tsx
Action: remove from public UI until backed by reproducible artifact

## Rule

No performance, accuracy, backtest, game-count, model-result, ROI, edge, or upset-detection claim may be used in product UI, docs, investor materials, or engineering notes unless backed by:

- committed evaluation script
- accessible dataset or database artifact
- reproducible command
- generated report
- timestamp
- engine version
- feature version
- provider snapshot version
