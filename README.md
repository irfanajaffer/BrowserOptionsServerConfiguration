# Validation - BrowserOptions server configuration

Scenario: [dotnet/aspnetcore #68815](https://github.com/dotnet/aspnetcore/issues/68815)

Manual: [dotnet/aspnetcore #68479](https://github.com/dotnet/aspnetcore/issues/68479)

## Build tested

```text
.NET SDK 11.0.100-preview.7.26381.103
```

The repository-level `global.json` pins the required .NET 11 Preview 7 SDK.

## Sample applications

| Project | Render mode | Validation |
|---|---|---|
| `BlazorStaticSSR` | Static SSR | Endpoint and per-request logging; `Ssr.PreserveDom` |
| `BlazorServerApp` | Interactive Server | Per-request isolation; reconnect timing and custom dialog |
| `BlazorAppAuto` | Interactive Auto | Initial Server rendering and cached WebAssembly transition |

Normal requests use each sample's configured normal logging level. Add `?detailed=true` to apply request-level `LogLevel.Trace` through `<ConfigureBrowser>`.

## How to run

From the repository root, run the required sample:

```powershell
dotnet run --project .\BlazorStaticSSR\BlazorStaticSSR\BlazorStaticSSR.csproj --launch-profile http
dotnet run --project .\BlazorServerApp\BlazorServerApp\BlazorServerApp.csproj --launch-profile http
dotnet run --project .\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto\BlazorAppAuto.csproj --launch-profile http
```

| Project | Normal URL | Detailed URL |
|---|---|---|
| Static SSR | `http://localhost:5003/` | `http://localhost:5003/?detailed=true` |
| Interactive Server | `http://localhost:5144/counter` | `http://localhost:5144/counter?detailed=true` |
| Interactive Auto | `http://localhost:5058/counter` | `http://localhost:5058/counter?detailed=true` |

Run one application at a time. Open normal and detailed URLs in separate browser profiles and enable **Verbose** Console output.

### Multi-instance proxy sample

The Interactive Server solution includes a YARP proxy for manual multi-instance isolation testing.
Start each command in a separate terminal from the repository root:

```powershell
dotnet run --project .\BlazorServerApp\BlazorServerApp\BlazorServerApp.csproj --launch-profile backend-a
dotnet run --project .\BlazorServerApp\BlazorServerApp\BlazorServerApp.csproj --launch-profile backend-b
dotnet run --project .\BlazorServerApp\BlazorServerApp.Proxy\BlazorServerApp.Proxy.csproj --launch-profile proxy
```

Confirm `http://127.0.0.1:5200/proxy-health`, then open these through the proxy in separate fresh
browser profiles:

- normal: `http://127.0.0.1:5200/counter`
- detailed: `http://127.0.0.1:5200/counter?detailed=true`

Ordinary HTTP requests use round-robin routing without affinity. Requests under `/_blazor`,
including negotiation and WebSockets, use the `.BrowserOptions.Proxy.Affinity` cookie. Record the
rendered server instance and request ID, the `X-Server-Instance` response header, the `/_blazor`
WebSocket ID, and the Blazor console output for each profile. The rendered `LogLevel` is fixture
input only; effective isolation must be decided from the browser logging difference described in
the evidence procedure.

## How to verify

```powershell
dotnet build .\BlazorStaticSSR\BlazorStaticSSR.slnx -nologo -v:minimal
dotnet build .\BlazorServerApp\BlazorServerApp.slnx -nologo -v:minimal
dotnet build .\BlazorAppAuto\BlazorAppAuto.slnx -nologo -v:minimal
```

Expected results:

- all three solutions build successfully;
- normal and detailed requests remain isolated and use their expected logging levels;
- Static SSR preserves or replaces streamed DOM according to `Ssr.PreserveDom`;
- Interactive Server uses the configured reconnect dialog, three retries, and five-second retry interval; and
- Interactive Auto starts on Server, transitions to cached WebAssembly, remains interactive after server shutdown, and does not show the reconnect dialog while WebAssembly-backed.

Detailed manual steps and expected outcomes are in [`evidence/README.md`](evidence/README.md).

## Configuration tested

- Windows
- Static SSR
- Interactive Server
- Interactive Auto, both Server-backed and cached WebAssembly-backed
- Two Interactive Server instances behind a reverse proxy

Explicit Interactive WebAssembly, standalone Blazor WebAssembly, and Blazor Hybrid are outside the tested scope.

## Evidence

- Manual validation steps and expected outcomes: [`evidence/README.md`](evidence/README.md)
- Canonical validation report: [`evidence/68815-BrowserOptions-Full-Report.md`](evidence/68815-BrowserOptions-Full-Report.md)
- Static SSR evidence: [`evidence/static-ssr/`](evidence/static-ssr/)
- Interactive Server evidence: [`evidence/interactive-server/`](evidence/interactive-server/)
- Interactive Auto evidence: [`evidence/interactive-auto/`](evidence/interactive-auto/)

## Current validation status

The overall result is **partially passed with documented failures**. Configured reconnect behavior,
the default reconnect comparison, proxy routing/affinity, and the Interactive Auto execution-mode
transition passed. Normal-versus-detailed browser logging and feature-only `PreserveDom` inverse
behavior failed. Direct and proxy effective BrowserOptions isolation remain inconclusive because
browser logging did not provide an observable distinction.

The tested SDK does not expose `BrowserOptions.GetBrowserOptions(HttpContext)`. Effective API
readback is therefore **not verifiable** and is not claimed as passed. See the canonical validation
report for the complete pass, fail, inconclusive, not-verifiable, and out-of-scope matrix.
