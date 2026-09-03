using BlazorStaticSSR.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents();

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
    .WithBrowserOptions(options =>
    {
        options.LogLevel = LogLevel.Warning;
        options.Ssr.PreserveDom = Program.PreserveDom;
    });

app.Run();

public partial class Program
{
    // Change this single value to run the PreserveDom=true/false A/B test.
    public const bool PreserveDom = true;
}
