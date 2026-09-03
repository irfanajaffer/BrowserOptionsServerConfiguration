# PreserveDom enhanced navigation test

This fixture tests `Ssr.PreserveDom` during enhanced navigation, the scenario covered by the
public API. The Home page marks a DOM node with client-only state. Following the test link performs
enhanced navigation to `/preserve-result`, which renders the corresponding destination node. The
browser helper reports whether the original node and its client-only state survived.

## Prerequisites

- .NET 11 SDK
- A browser with developer tools (Chrome, Edge, or Firefox)

## Test steps

1. Open `Program.cs` and set `Program.PreserveDom`:

   - For preserved DOM testing: `public const bool PreserveDom = true`
   - For replacement testing: `public const bool PreserveDom = false`

2. Build and run the project.
3. Open the Home page in a fresh browser tab.
4. Select **Run enhanced navigation test**. Do not reload or open the destination directly.
5. Compare behavior between the two runs:
   - `true`: green **PRESERVED** badge; the same element, client marker, and focus survive.
   - `false`: red **REPLACED** badge; the original element is removed and a new one is inserted.
6. For an exact result, run this in the browser console after the final content appears:

   `window.preserveDomTestResult`

## Notes

- Streaming rendering is not a valid discriminator for this setting. `Ssr.PreserveDom` controls
  DOM preservation during enhanced navigation, not streamed updates within one response.
- A normal browser refresh creates a new document in both modes and does not test enhanced navigation.
- DOM preservation retains reusable node identity and browser/client state. It does not mean that
  stale server-rendered text must remain unchanged; the DOM synchronizer still applies the final
  server output.
- The sample uses only `WithBrowserOptions` to configure `Ssr.PreserveDom`. The JavaScript helper
  observes node identity and client state but does not configure Blazor or call `Blazor.start`.
- If the configured value is not emitted or the observed DOM behavior does not change between the
  two runs, record the feature as not verifiable with this SDK. Do not add a JavaScript fallback.
