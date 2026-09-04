# Run and validate the BrowserOptions samples

The procedures below describe the expected behavior from issue #68815.

**Validation status: `PreserveDom` rerun completed; report correction required before submission.**

The original validation used commit
`ebc7922175650b20cf1f30cac7b41683742755b9` (`additional evidences committed`). Its reconnect and
Interactive Auto conclusions are supported, and the browser logging problem is reproducible.
However, that commit has no routed `/preserve-result` destination, so its `PreserveDom` conclusions
are invalid. The corrected destination fixture was rerun with both values. `PreserveDom=true`
passed by preserving node identity and client state. `PreserveDom=false` failed because it also
preserved the node, so the required inverse behavior failed. Before submission, commit the
corrected fixture and record that exact rerun commit in the report.

See the committed [full validation report](68815-BrowserOptions-Full-Report.docx). The report must
be corrected manually to identify the original tested commit, identify the corrected rerun commit,
and replace its invalid original `PreserveDom` result with the rerun outcome above.

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
