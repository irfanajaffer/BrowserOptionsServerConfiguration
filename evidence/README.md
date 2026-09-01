# BrowserOptions validation evidence

Final evidence set for [dotnet/aspnetcore#68815](https://github.com/dotnet/aspnetcore/issues/68815).

## Status

- **Overall result:** PASS
- **SDK under test:** `11.0.100-preview.7.26381.103`
- **Execution date:** 2026-09-01
- **Scope:** Static SSR, Interactive Server, Interactive Auto, and a multiple-server-instance proxy scenario
- **API limitation:** `BrowserOptions.GetBrowserOptions(HttpContext)` is not exposed by the pinned SDK. That documentation-specific readback check is **Not testable** and is not claimed as passed. Effective behavior was validated through browser output and isolation tests.

## Retained evidence

### Environment

- `sdk-info.txt` — SDK and runtime information.

### Static SSR

- `static-ssr/g-02-static-ssr-build.txt` — successful build.
- `static-ssr/c-01-endpoint-loglevel-console.txt` — endpoint logging behavior.
- `static-ssr/c-03-detailed-console.txt` — request-level detailed logging behavior.
- `static-ssr/Information vs Trace logging comparison.png` — normal/detailed comparison and override precedence.
- `static-ssr/preserved-DOM.png` — `PreserveDom = true` result.
- `static-ssr/replaced DOM.png` — `PreserveDom = false` result.

### Interactive Server

- `interactive-server/g-03-interactive-server-build.txt` — successful build.
- `interactive-server/c-02-normal-console.txt` — endpoint logging behavior.
- `interactive-server/c-03-detailed-console.txt` — request-level override behavior.
- `interactive-server/c-04-two-visitors.png` — concurrent normal/detailed visitor comparison.
- `interactive-server/c-04-two-visitors-assessment.txt` — request-isolation assessment.
- `interactive-server/Screenshot 2026-08-31 171510.png` — custom reconnect dialog.
- `interactive-server/Screen Recording 2026-09-01 103247.mp4` — configured retry behavior and recovery.
- `interactive-server/multi-instance-proxy-side-by-side.png` — side-by-side multi-instance result.
- `interactive-server/multi-instance-proxy-results.json` — structured multi-instance result.
- `interactive-server/multi-instance-proxy-test-procedure.md` — multi-instance procedure and acceptance criteria.
- `interactive-server/multi-instance-proxy-validation.js` — reproducible validation script.

### Interactive Auto

- `interactive-auto/g-04-interactive-auto-build.txt` — successful build.
- `interactive-auto/c-07-normal-console.txt` — normal first-visit browser output.
- `interactive-auto/c-07-detailed-console.txt` — detailed request override output.
- `interactive-auto/network-tab-cached-reload.png` — cached WebAssembly reload evidence.
- `interactive-auto/interactive-auto-cached-reload-reconnect.webm` — cached WebAssembly remains interactive without server reconnect UI.
- `interactive-auto/interactive-auto-validation.js` — reproducible Auto transition validation script.
- `interactive-auto/interactive-auto-results.json` — structured Auto transition result.

## Disposition of the documented readback API

The pinned Preview 7 SDK does not provide `BrowserOptions.GetBrowserOptions(HttpContext)`. The samples therefore do not present supplied component values as framework API readback. This item is recorded as **Not testable in the pinned SDK**, while the available BrowserOptions behavior is recorded as **PASS**.
