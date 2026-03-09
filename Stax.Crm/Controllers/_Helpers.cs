using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Stax.Crm.Controllers;

public static class ControllerHelpers
{
    public static long GetUserId(this ControllerBase c)
    {
        var s = c.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(s, out var id) ? id : 0;
    }

    public static bool IsAdmin(this ControllerBase c) => c.User.IsInRole("ADMIN");

    public static IActionResult ForbidWithMessage(this ControllerBase c, string message = "У вас недостаточно прав")
        => new ObjectResult(new { message }) { StatusCode = 403 };
}
