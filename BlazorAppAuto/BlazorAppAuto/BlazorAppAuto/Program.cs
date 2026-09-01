using BlazorAppAuto.Client.Pages;
using BlazorAppAuto.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(BlazorAppAuto.Client._Imports).Assembly)
    .WithBrowserOptions(options =>
    {
        options.LogLevel = LogLevel.Information;
        options.Server.ReconnectionMaxRetries = 3;
        options.Server.ReconnectionRetryInterval = TimeSpan.FromSeconds(5);
        options.Server.ReconnectionDialogId = "validation-reconnect-modal";
        options.Ssr.PreserveDom = true;
    });

app.Run();
