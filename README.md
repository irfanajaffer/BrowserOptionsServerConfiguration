# BrowserOptions server configuration validation

Validation sample for [dotnet/aspnetcore#68815](https://github.com/dotnet/aspnetcore/issues/68815), prepared from the public scenario and the [Blazor validation testing manual](https://github.com/dotnet/aspnetcore/issues/68479).

## Build under test

- SDK: `11.0.100-preview.7.26381.103`
- SDK commit: `e2c1e00b3d`
- Target framework: `net11.0`
- OS: Windows

The repository-level `global.json` pins the SDK used to create and build these samples.

## Sample mapping

| Project | Template nature | Intended coverage |
|---|---|---|
| `BlazorStaticSSR/BlazorStaticSSR` | Blazor Web App with no interactivity | Static SSR, endpoint and per-request `LogLevel`, and a streaming `Ssr.PreserveDom` true/false fixture |
| `BlazorServerApp/BlazorServerApp` | Blazor Web App with Interactive Server | Interactive Server, endpoint and per-request options, reconnection timing, and custom dialog |
| `BlazorAppAuto/BlazorAppAuto` | Blazor Web App with Server and WebAssembly services | Existing Static SSR pages and the Interactive Auto counter; endpoint and per-request options and Auto's Server-to-WebAssembly transition |

The projects retain their original template render modes: no interactivity, Interactive Server, and Interactive Auto. The Static SSR sample contains one explicitly documented Preview 7 JavaScript startup workaround for its `PreserveDom` fixture. The Server and Auto samples use normal framework autostart. Explicit Interactive WebAssembly, standalone WebAssembly, and Hybrid are not represented by these three original samples.

## Per-request browser configuration

All three server projects place `<ConfigureBrowser Options="..." />` in the root `App.razor`. The component inspects the current `HttpContext` and overrides the endpoint-level `LogLevel.Information` with `LogLevel.Trace` when either of these request conditions is present:

- Query string: `?detailed=true`
- Request header: `X-Detailed-Logging: true`

Requests that meet neither condition explicitly select `LogLevel.Information`, matching the `WithBrowserOptions` endpoint value. Detailed requests intentionally conflict with that endpoint value and validate that `<ConfigureBrowser>` wins only for the matching request. Explicitly setting both request branches also prevents a detailed request from affecting a later normal request on the pinned preview build.

Use a full page load when changing the condition. To validate request isolation, open the normal and detailed URLs in two separate browser profiles or an ordinary and InPrivate window, keep both open concurrently, select **Verbose** in both Console level filters, and compare their output:

| Project | Normal request (`Information`) | Detailed request (`Trace`) |
|---|---|---|
| Static SSR | `http://localhost:5003/` | `http://localhost:5003/?detailed=true` |
| Interactive Server | `http://localhost:5144/counter` | `http://localhost:5144/counter?detailed=true` |
| Interactive Auto | `http://localhost:5058/counter` | `http://localhost:5058/counter?detailed=true` |

The header condition is an alternative for a browser profile or HTTP client that can add request headers. Do not set both conditions when testing the normal visitor.

## Prerequisites and build

Use Windows and a Chromium-based browser with its developer tools available. From the repository root, confirm that `global.json` selects the expected SDK, then build all three samples:

```powershell
dotnet --info
dotnet build .\BlazorStaticSSR\BlazorStaticSSR.slnx -nologo -v:minimal
dotnet build .\BlazorServerApp\BlazorServerApp.slnx -nologo -v:minimal
dotnet build .\BlazorAppAuto\BlazorAppAuto.slnx -nologo -v:minimal
```

Expected result: `dotnet --info` reports SDK `11.0.100-preview.7.26381.103`, commit `e2c1e00b3d`, and all three builds succeed. The SDK may emit informational `NETSDK1057` output because this is a preview SDK.

## Reproduction steps

Run each sample in a separate terminal from the repository root. Keep the terminal visible because the Server and Auto scenarios require stopping and restarting the same process. Open browser developer tools before loading a test URL, preserve the Console log, and record Network traffic when validating the active runtime.

### 1. Static SSR

1. Start the sample:

	```powershell
	dotnet run --project .\BlazorStaticSSR\BlazorStaticSSR\BlazorStaticSSR.csproj --launch-profile http --no-build
	```

2. Open `http://localhost:5003/` and `http://localhost:5003/?detailed=true` in separate browser profiles. In developer tools, select **Verbose** in both Console level filters and reload both pages.
3. Confirm that the normal request reflects endpoint `LogLevel.Information` and that `<ConfigureBrowser>` changes only the detailed request to `LogLevel.Trace`.
4. The Home page contains the streaming `PreserveTest` fixture. After approximately three seconds, confirm that its badge reports **PRESERVED** when `Program.PreserveDom` is `true` and **REPLACED** when it is `false`.
5. Repeat after changing the single `Program.PreserveDom` constant and rebuilding. The constant drives both `WithBrowserOptions` and the temporary Preview 7 startup workaround, so the two values cannot drift apart.
6. Select **Weather**, then **Home**, and confirm that enhanced navigation completes without a full document reload. This is the basic Static SSR smoke test.
7. Stop the sample with **Ctrl+C**.

This fixture covers D-01 and D-02 with two separate builds. It does not implement request-dependent `PreserveDom`, so D-03 remains **Not run**.

### 2. Interactive Server

1. Start the sample:

	```powershell
	dotnet run --project .\BlazorServerApp\BlazorServerApp\BlazorServerApp.csproj --launch-profile http --no-build
	```

2. Open `http://localhost:5144/counter` and `http://localhost:5144/counter?detailed=true` in separate browser profiles. Confirm that their Console output reflects `Information` and `Trace`, respectively, then select **Click me** and confirm that the count increases. In the Network panel, confirm that a `/_blazor` WebSocket connection is active.
3. Leave the browser open and stop the server with **Ctrl+C**. Confirm that the custom **Validation reconnect dialog** appears instead of the default reconnect UI.
4. Keep the server stopped. Use Console timestamps or the Network panel to confirm three retry attempts at approximately five-second intervals and then the terminal failure state.
5. Start the same command again, reload `/counter`, increment the counter, and stop the server again.
6. Restart the same command before all retries are exhausted. Confirm that the dialog closes, the circuit reconnects, and the counter remains interactive.
7. Stop the server when finished.

These steps exercise `Server.ReconnectionMaxRetries = 3`, a five-second `Server.ReconnectionRetryInterval`, and `Server.ReconnectionDialogId = "validation-reconnect-modal"`.

### 3. Interactive Auto

1. In developer tools for `http://localhost:5058`, clear site data, including Cache Storage, before the first visit. Close any other tabs for this origin.
2. Start the sample:

	```powershell
	dotnet run --project .\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto.csproj --launch-profile http --no-build
	```

3. Open `http://localhost:5058/counter`. On this fresh visit, confirm that **Click me** works and that the Network panel shows an active `/_blazor` WebSocket, proving that the Auto component is initially Server-backed. In a separate browser profile with cleared site data, open `http://localhost:5058/counter?detailed=true` and compare the normal `Information` output with the detailed request's `Trace` output.
4. While leaving the page open, stop the server. Confirm the same custom reconnect dialog, three retries, and five-second interval used by the Interactive Server sample. Restart before exhaustion to test recovery, or leave it stopped to test the terminal failure state; use separate runs for both outcomes.
5. Restart the app if necessary, reload `/counter`, and wait for all WebAssembly resources to finish downloading. Do not clear site data after this point.
6. Reload `/counter` again. Confirm that the WebAssembly resources are served from browser cache and that there is no active `/_blazor` WebSocket for the component. If Auto still selects Server, wait for downloads to finish and reload once more.
7. Stop the server while the cached WebAssembly counter is loaded. Confirm that the counter remains interactive and that the server reconnect dialog does not appear. This distinguishes the cached WebAssembly run from the first Server-backed visit.
8. Stop any remaining server process with **Ctrl+C**.

## Record the result

Save build logs, Console exports, Network HAR files, screenshots, and reconnection recordings under the matching `evidence/` subfolder. Use the artifact names and the **Pass**, **Fail**, **Blocked**, or **Not run** statuses defined in `VALIDATION-CHECKLIST.md` and `evidence/README.md`.

The three samples compile and the available BrowserOptions behavior passed validation for endpoint-level logging, request-level `<ConfigureBrowser>`, override precedence, reconnection, DOM preservation, Interactive Auto transition, and concurrent-request isolation. `BrowserOptions.GetBrowserOptions(httpContext)` readback is not exposed by the pinned SDK, so it is recorded as **Not testable** rather than treating observed browser behavior as API readback coverage.

## Scope boundary

This validation report covers the three supplied projects: Static SSR, Interactive Server, and Interactive Auto. The following configurations are not represented by those projects and are outside this report's executed scope:

- A page explicitly using `InteractiveWebAssembly` (the Auto project currently has only an `InteractiveAuto` client page).
- Standalone Blazor WebAssembly.
- Blazor Hybrid (MAUI).

They are not counted as failures in the reported scope. Interactive Auto was tested as both a fresh Server-backed visit and a cached WebAssembly-backed reload.

The final result for the executed scope is **PASS**. See `evidence/README.md` for the retained evidence index and the disposition of the unavailable readback API.
