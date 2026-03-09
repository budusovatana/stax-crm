using System.Security.Cryptography;

namespace Stax.Persistence.Services
{
    public class PasswordHasher
    {
        private const int Iterations = 100_000;

        public void CreateHash(string password, out string salt, out string hash)
        {
            using var rng = RandomNumberGenerator.Create();
            var saltBytes = new byte[16];
            rng.GetBytes(saltBytes);

            using var pbkdf2 = new Rfc2898DeriveBytes(
                password,
                saltBytes,
                Iterations,
                HashAlgorithmName.SHA256);

            var hashBytes = pbkdf2.GetBytes(32);

            salt = Convert.ToBase64String(saltBytes);
            hash = Convert.ToBase64String(hashBytes);
        }

        public bool Verify(string password, string salt, string hash)
        {
            var saltBytes = Convert.FromBase64String(salt);

            using var pbkdf2 = new Rfc2898DeriveBytes(
                password,
                saltBytes,
                Iterations,
                HashAlgorithmName.SHA256);

            var computedHashBytes = pbkdf2.GetBytes(32);
            var expectedHashBytes = Convert.FromBase64String(hash);

            return CryptographicOperations.FixedTimeEquals(computedHashBytes, expectedHashBytes);
        }
    }
}
