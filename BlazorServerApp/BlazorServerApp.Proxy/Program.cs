var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.MapGet("/proxy-health", () => Results.Ok(new
{
    proxy = "ready",
    backends = new[] { "http://127.0.0.1:5201", "http://127.0.0.1:5202" }
}));
app.MapReverseProxy();

app.Run();