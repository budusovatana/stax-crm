using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using Npgsql.NameTranslation;
using Stax.Domain.Enums;
using Stax.Persistence;
using Stax.Persistence.Services;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// Render / hosting port
// Локально будет 5102, на Render возьмется PORT
// =====================================================
var port = Environment.GetEnvironmentVariable("PORT") ?? "5102";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// =====================================================
// PostgreSQL enums mapping (ВАЖНО для EF Core 3.1 + Npgsql)
// Чтобы enum значения НЕ превращались в lower/snake_case
// =====================================================
var nt = new NpgsqlNullNameTranslator();

NpgsqlConnection.GlobalTypeMapper.MapEnum<UserRole>("stax1.user_role", nt);
NpgsqlConnection.GlobalTypeMapper.MapEnum<CarColor>("stax1.car_color", nt);
NpgsqlConnection.GlobalTypeMapper.MapEnum<InvestmentStatus>("stax1.investment_status", nt);
NpgsqlConnection.GlobalTypeMapper.MapEnum<PayoutType>("stax1.payout_type", nt);
NpgsqlConnection.GlobalTypeMapper.MapEnum<ScheduleStatus>("stax1.schedule_status", nt);
NpgsqlConnection.GlobalTypeMapper.MapEnum<DocType>("stax1.doc_type", nt);

// =====================================================
// Controllers + JSON (enum как строки)
// =====================================================
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "STAX API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Вставь токен так: Bearer {твой_токен}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// =====================================================
// Connection string
// Сначала берем из environment variable:
// ConnectionStrings__Default
// Если её нет — берем из appsettings.json
// =====================================================
var connectionString =
    Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? builder.Configuration.GetConnectionString("Default");

// =====================================================
// DbContext
// =====================================================
builder.Services.AddDbContext<StaxDbContext>(opt =>
{
    opt.UseNpgsql(connectionString);
});

// =====================================================
// Services
// =====================================================
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<InvestmentCalculator>();
builder.Services.AddScoped<PayoutScheduleBuilder>();
builder.Services.AddScoped<SeedData>();

// =====================================================
// JWT
// Сначала берем из environment variables, потом из appsettings
// =====================================================
var jwtKey =
    Environment.GetEnvironmentVariable("Jwt__Key")
    ?? builder.Configuration["Jwt:Key"]
    ?? "CHANGE_ME_LONG_KEY_64_CHARS_MIN______________________________";

var issuer =
    Environment.GetEnvironmentVariable("Jwt__Issuer")
    ?? builder.Configuration["Jwt:Issuer"]
    ?? "stax";

var audience =
    Environment.GetEnvironmentVariable("Jwt__Audience")
    ?? builder.Configuration["Jwt:Audience"]
    ?? "stax";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// =====================================================
// Global exception handler
// =====================================================
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Console.WriteLine("===== UNHANDLED EXCEPTION =====");
        Console.WriteLine(ex);
        Console.WriteLine("===== END =====");

        if (!ctx.Response.HasStarted)
        {
            ctx.Response.StatusCode = 500;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            await ctx.Response.WriteAsync("{\"message\":\"Внутренняя ошибка сервера\"}");
        }
    }
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// =====================================================
// Seed admin
// =====================================================
using (var scope = app.Services.CreateScope())
{
    var seed = scope.ServiceProvider.GetRequiredService<SeedData>();
    await seed.SeedAdminIfNeededAsync();
}

app.Run();