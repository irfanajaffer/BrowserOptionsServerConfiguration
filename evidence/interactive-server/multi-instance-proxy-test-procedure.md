# Multiple server instances and reverse-proxy isolation

## Result

**Pass** — normal and detailed requests retained their own `BrowserOptions` values while a round-robin reverse proxy distributed document requests across two server processes. Two isolated interactive clients then remained pinned to different instances through the same proxy, including three simultaneous reload cycles.

## Fixture

The Interactive Server sample exposes these diagnostics in its root response:

- configured server instance (`ServerInstance` configuration);
- request variant and the request-scoped `LogLevel` supplied to `<ConfigureBrowser>`;
- backend request host and forwarded proxy host;
- unique ASP.NET Core request ID.

Every response also includes `X-Server-Instance`. The validation script starts:

| Role | Address | Configuration |
|---|---|---|
| Reverse proxy | `http://127.0.0.1:5200` | Round robin without a cookie; `bo-backend` affinity cookie when supplied |
| Instance A | `http://127.0.0.1:5201` | `ServerInstance=A` |
| Instance B | `http://127.0.0.1:5202` | `ServerInstance=B` |

## Automated procedure

From the repository root, build the Interactive Server solution and run:

`npm run test:multi-instance-proxy`

The script performs two checks:

1. **No affinity:** sends eight alternating normal and detailed document requests without cookies. The proxy alternates instances A and B. Every returned instance marker, variant, and supplied log level must match that request (`normal`/`Warning` or `detailed`/`Trace`). Both backends must participate.
2. **Affinity:** opens two isolated Chromium contexts through the same proxy origin. Client A is pinned to instance A and loads `/counter`; client B is pinned to instance B and loads `/counter?detailed=true`. Both circuits must connect by WebSocket, both counters must work, and three simultaneous reload cycles must preserve each client's instance, variant, and log level.

Interactive Server negotiate and WebSocket requests use affinity because an in-memory SignalR circuit must reconnect to the backend that owns it. The no-affinity check intentionally validates independent root document requests; it does not claim that an unpinned in-memory circuit can move between servers without a backplane or distributed circuit state.

## Pass criteria

- no-affinity requests are served by both backend processes;
- each normal response reports `normal` and `Warning` regardless of backend;
- each detailed response reports `detailed` and `Trace` regardless of backend;
- response instance headers agree with the rendered instance marker;
- both isolated clients connect and remain independently interactive;
- client A remains on instance A with `normal`/`Warning` through all reloads;
- client B remains on instance B with `detailed`/`Trace` through all reloads;
- both rendered requests report proxy host `127.0.0.1:5200`;
- client request IDs differ.

## Evidence

- `multi-instance-proxy-side-by-side.png` — side-by-side normal and detailed interactive clients.
- `multi-instance-proxy-results.json` — machine-readable assertions and all reload states.
- `multi-instance-proxy-routes.txt` — HTTP and WebSocket backend routing decisions.
- `multi-instance-proxy-server.log` — output from instances A and B.
- `multi-instance-proxy-browser-console.txt` — browser connection output for both clients.
- `multi-instance-normal.png` and `multi-instance-detailed.png` — uncropped individual page captures.

The existing `ReconnectModal.razor.js` null-reference message may still appear in the browser console. It is a previously recorded sample issue and did not prevent either WebSocket circuit or counter from operating in this run.
