# Run and validate the BrowserOptions samples


## Evidence catalog

| Evidence | Description |
|---|---|
| [SDK verification](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/68815-BrowserOptions-Full-Report.docx) | `dotnet --info` output confirming .NET SDK `11.0.100-preview.7.26381.103` |
| [Build output: Static SSR](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/g-02-static-ssr-build.txt), [Interactive Server](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/g-03-interactive-server-build.txt), [Interactive Auto](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-auto/g-04-interactive-auto-build.txt) | Successful clean build logs for final validation runs |
| [Static SSR logging: comparison](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/Information%20vs%20Trace%20logging%20comparison.png), [normal console](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/c-01-endpoint-loglevel-console.txt), [detailed console](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/c-03-detailed-console.txt) | Normal versus detailed console output showing no observable `LogLevel` differentiation |
| [Interactive Server logging: normal console](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/c-02-normal-console.txt), [detailed console](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/c-03-detailed-console.txt) | Normal versus detailed console output showing identical Information-level messages |
| [Static SSR PreserveDom validation](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/preserve%20dom%20failed.mp4) | Feature-only `Ssr.PreserveDom=true` and `Ssr.PreserveDom=false` comparison evidence |
| [PreserveDom inverse behavior](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/static-ssr/preserve%20dom%20failed.mp4) | Evidence demonstrating lack of expected inverse behavior between `PreserveDom` settings |
| [Interactive Server request override](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/Per-request%20override%20fails.mp4) | Endpoint and request-level `BrowserOptions` comparison evidence |
| [Custom reconnect dialog](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/validation%20reconnect%20dialog.png) | Screenshot showing the configured reconnect dialog is displayed |
| [Retry timing](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/three%20retries%20reconnect.png) | Timestamped evidence demonstrating three reconnect attempts at approximately five-second intervals |
| [Reconnect recovery](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/retry%20before%20exhaustion.png) | Evidence showing successful recovery before retry exhaustion |
| [Retry exhaustion](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/disconnected%20and%20retry.mp4) | Evidence showing the terminal failed-to-rejoin state after configured retries are exhausted |
| [Default reconnect comparison](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/Default%20value%20configuration.png) | Evidence captured after removing `BrowserOptions` configuration and validating default reconnect behavior |
| [BrowserOptions readback investigation](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/API%20unavailablity.png) | Validation confirming `BrowserOptions.GetBrowserOptions(HttpContext)` is unavailable in the pinned SDK |
| [Interactive Auto first visit](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-auto/Server-backed%20visit.png) | Network capture showing an active `/_blazor` connection during Server-backed execution |
| [Interactive Auto cached reload](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-auto/network-tab-cached-reload.png) | Network capture showing the transition to WebAssembly-backed execution |
| [Interactive Auto cached shutdown behavior](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-auto/interactive-auto-cached-reload-reconnect.webm) | Recording demonstrating cached WebAssembly execution remains interactive without reconnect UI |
| [Option precedence](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/Per-request%20override%20fails.mp4) | Browser comparison evidence for endpoint versus request-level configuration |
| [Concurrent visitors](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/c-04-two-visitors.png) | Side-by-side browser profiles, request identifiers, and WebSocket connections |
| [Concurrent visitor isolation assessment](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/two%20simultaneous%20visitors.png) | Evidence showing effective `BrowserOptions` isolation could not be distinguished through browser behavior |
| [Multi-instance proxy routing](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/multi-instance-proxy-results.json), [proxy recording](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/proxy%20validation.mp4) | Backend routing, request identity, affinity, and sticky-session evidence |
| [Proxy isolation assessment](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-server/multi-instance-proxy-results.json) | Evidence showing proxy routing succeeded but effective `BrowserOptions` isolation remained indistinguishable |
| [Runtime cleanliness](https://github.com/irfanajaffer/BrowserOptionsServerConfiguration/blob/main/evidence/interactive-auto/interactive-auto-results.json) | Current validation results confirming absence of the previously observed reconnect-module exception |

## Prerequisites

- Windows
- A Chromium-based browser with developer tools
- .NET SDK `11.0.100-preview.7.26381.103`, selected by the repository `global.json`

Run all commands from the repository root. Run one sample at a time.

## Build the samples

```powershell
dotnet build .\BlazorStaticSSR\BlazorStaticSSR.slnx -nologo -v:minimal
dotnet build .\BlazorServerApp\BlazorServerApp.slnx -nologo -v:minimal
dotnet build .\BlazorAppAuto\BlazorAppAuto.slnx -nologo -v:minimal
```

### Expected outcome

All three solutions build successfully.

## Static SSR

1. Start the sample:

   ```powershell
   dotnet run --project .\BlazorStaticSSR\BlazorStaticSSR\BlazorStaticSSR.csproj --launch-profile http --no-build
   ```

2. Open these URLs in separate browser profiles:
   - Normal: `http://localhost:5003/`
   - Detailed: `http://localhost:5003/?detailed=true`
   Alternatively, use the **Warning** and **Trace** browser logging links in the sample. Each link
   opens a new tab and forces a full document load.
3. Enable **Verbose** output in both browser consoles and reload both pages.
4. On the Home page, select **Run enhanced navigation test**. Do not reload or open the destination directly.
5. Confirm that `/preserve-result` renders and the fixture reports **REPLACED** with the current
   `Program.PreserveDom = false` setting.
6. In the browser console, record `window.preserveDomTestResult`.
7. Stop the sample with **Ctrl+C**.
8. Change `Program.PreserveDom` to `true`, rebuild the Static SSR solution, rerun the sample, and
   repeat the enhanced navigation from Home.
9. Confirm that the fixture now reports **PRESERVED**, record `window.preserveDomTestResult`, then
   stop the sample.

### Expected outcomes from issue guidance

- The normal request reports `LogLevel.Warning`.
- The detailed request reports `LogLevel.Trace`.
- The two requests retain their own logging values.
- The enhanced-navigation fixture reports **REPLACED** with `PreserveDom = false` and **PRESERVED**
   with `PreserveDom = true`.
- Navigation from Home to `/preserve-result` completes successfully.

### Observed corrected rerun

- `PreserveDom=true`: **Passed**. Node identity and client state were preserved.
- `PreserveDom=false`: **Failed**. Node identity and client state were still preserved.
- Inverse behavior: **Failed**. Both values produced the preserved-node result.

## Interactive Server

1. Start the sample:

   ```powershell
   dotnet run --project .\BlazorServerApp\BlazorServerApp\BlazorServerApp.csproj --launch-profile http --no-build
   ```

2. Open these URLs in separate browser profiles:
   - Normal: `http://localhost:5144/counter`
   - Detailed: `http://localhost:5144/counter?detailed=true`
   Alternatively, use the **Warning** and **Trace** browser logging links in the sample. Each link
   opens a new tab and forces a full document load.
3. Enable **Verbose** output in both browser consoles.
4. Select **Click me** on both pages and confirm that both counters increase.
5. In each Network panel, confirm that a `/_blazor` WebSocket is active.
6. Stop the server with **Ctrl+C** and leave the pages open.
7. Observe the reconnect dialog and retry attempts.
8. Start the same command again before all retries are exhausted.
9. Stop the sample with **Ctrl+C** when validation is complete.

### Expected outcomes from issue guidance

- The normal request reports `normal` and `LogLevel.Warning`.
- The detailed request reports `detailed` and `LogLevel.Trace`.
- Both pages remain independently interactive without request-value leakage.
- The custom validation reconnect dialog appears after server shutdown.
- Three reconnect attempts occur at approximately five-second intervals.
- Restarting the server before retries are exhausted closes the dialog and restores the connection.

## Interactive Auto

1. Clear site data, including Cache Storage, for `http://localhost:5058`.
2. Start the sample:

   ```powershell
   dotnet run --project .\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto.csproj --launch-profile http --no-build
   ```

3. Open `http://localhost:5058/counter` and select **Click me**.
4. In the Network panel, confirm that a `/_blazor` WebSocket is active on the fresh visit.
5. Open `http://localhost:5058/counter?detailed=true` in a separate browser profile with cleared site data.
   The **Warning** and **Trace** browser logging links can generate these variants without manually
   editing the query string; use separate fresh profiles when validating Auto startup behavior.
6. Compare the normal and detailed browser-console output.
7. Reload the normal counter page and wait for all WebAssembly resources to finish downloading.
8. Reload it again without clearing site data.
9. Confirm that the counter is WebAssembly-backed and no `/_blazor` WebSocket is active. If it is still Server-backed, wait for downloads to finish and reload again.
10. Stop the server with **Ctrl+C**, then use the counter again.

### Expected outcomes from issue guidance

- The normal request reports `LogLevel.Warning`.
- The detailed request reports `LogLevel.Trace`.
- The fresh Auto visit is Server-backed and interactive.
- A later reload uses cached WebAssembly resources without an active `/_blazor` WebSocket.
- After server shutdown, the cached WebAssembly counter remains interactive.
- The reconnect dialog does not appear while the counter is WebAssembly-backed.
