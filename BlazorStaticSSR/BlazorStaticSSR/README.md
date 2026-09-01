# PreserveDom streaming SSR test

This fixture tests `Ssr.PreserveDom` during a real streaming SSR update. `PreserveTest.razor`
first renders loading content, waits three seconds, and then streams final server content. The
browser helper keeps a reference to the initial element and reports whether that exact node and
its client-only state survived the streamed update.

Prerequisites
- .NET 11 SDK
- A browser with developer tools (Chrome/Edge/Firefox)

Quick steps

1. Open `Program.cs` and set `Program.PreserveDom`:

   - For preserved DOM testing: `public const bool PreserveDom = true`
   - For replacement testing: `public const bool PreserveDom = false`

2. Build and run the project from the project folder (BlazorStaticSSR):

   dotnet build
   dotnet run

   Note: if running from Visual Studio, just Start Debugging / Start Without Debugging.

3. Open the app in your browser. The URL is shown in the console output (usually http://localhost:5xxx).

4. Go to the Home page and watch the lower-right result badge:
   - First render: "Initial SSR content (waiting for streamed update)"
   - About three seconds later: "Final streamed SSR content: ..."

5. Compare behavior between the two runs (PreserveDom = true vs false):
   - `true`: green **PRESERVED** badge; the same element, client marker, and focus survive.
   - `false`: red **REPLACED** badge; the original element is removed and a new one is inserted.

6. For an exact result, run this in the browser console after the final content appears:

   `window.preserveDomTestResult`

Notes
- A normal browser refresh creates a new document in both modes, so it cannot demonstrate this
  setting. Observe the initial-to-final streamed update within one page request.
- DOM preservation retains reusable node identity and browser/client state. It does not mean that
  stale server-rendered text must remain unchanged; the DOM synchronizer still applies the final
  server output.
- Static SSR doesn't run `OnAfterRenderAsync`, so a JS interop call from that lifecycle method is
  not a valid test for this scenario.
- With the installed .NET 11 Preview 7 runtime, `WithBrowserOptions` did not emit the documented
   `Blazor-Configuration` DOM comment. The sample therefore passes the same `Program.PreserveDom`
   value directly to `Blazor.start` as a temporary preview workaround. Remove that workaround and
   restore normal autostart after updating to a runtime where the endpoint option is emitted.
