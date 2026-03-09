namespace Stax.Dto.Auth;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}
