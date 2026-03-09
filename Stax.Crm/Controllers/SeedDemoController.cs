using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stax.Domain.Entities;
using Stax.Domain.Enums;
using Stax.Persistence;

namespace Stax.Crm.Controllers;

[ApiController]
[Route("api/seed-demo")]
[Authorize(Roles = "ADMIN")]
public class SeedDemoController : ControllerBase
{
    private readonly StaxDbContext _db;
    public SeedDemoController(StaxDbContext db) => _db = db;

    private const string DemoTag = "[DEMO]";

    private static readonly string[] FirstNames =
    {
        "Алексей", "Дмитрий", "Сергей", "Андрей", "Михаил", "Иван", "Николай", "Павел", "Олег", "Артём",
        "Владимир", "Евгений", "Максим", "Александр", "Роман", "Виктор", "Денис", "Константин", "Юрий", "Борис",
        "Григорий", "Валерий", "Анатолий", "Игорь", "Пётр", "Тимофей", "Руслан", "Вадим", "Геннадий", "Леонид"
    };

    private static readonly string[] LastNames =
    {
        "Иванов", "Петров", "Сидоров", "Козлов", "Новиков", "Морозов", "Соколов", "Лебедев", "Волков", "Фёдоров",
        "Кузнецов", "Попов", "Васильев", "Зайцев", "Павлов", "Семёнов", "Голубев", "Виноградов", "Богданов", "Воробьёв",
        "Медведев", "Никитин", "Тарасов", "Белов", "Комаров", "Орлов", "Киселёв", "Макаров", "Андреев", "Ковалёв"
    };

    private static readonly string[] Patronymics =
    {
        "Александрович", "Владимирович", "Сергеевич", "Андреевич", "Михайлович",
        "Игоревич", "Николаевич", "Дмитриевич", "Олегович", "Павлович",
        "Евгеньевич", "Максимович", "Романович", "Викторович", "Юрьевич"
    };

    private static readonly string[] CarModels =
    {
        "Toyota Camry", "Toyota RAV4", "Toyota Land Cruiser", "Kia Rio", "Kia K5", "Kia Sportage",
        "Hyundai Solaris", "Hyundai Tucson", "Hyundai Santa Fe", "Volkswagen Polo", "Volkswagen Tiguan",
        "Skoda Octavia", "Skoda Kodiaq", "Renault Logan", "Renault Duster", "BMW 3 Series", "BMW X5",
        "Mercedes C-Class", "Mercedes E-Class", "Audi A4", "Audi Q5", "Mazda 6", "Mazda CX-5",
        "Lada Vesta", "Lada Granta", "Honda Civic", "Honda CR-V", "Nissan Qashqai", "Nissan X-Trail",
        "Chevrolet Cruze", "Geely Coolray", "Chery Tiggo 7 Pro", "Haval Jolion", "Changan CS55 Plus",
        "GAC GS8", "Exeed TXL", "Omoda C5", "Jetour Dashing", "Tank 300", "Li Auto L7"
    };

    private static readonly string[] OwnerCompanies =
    {
        "АвтоЛизинг", "ТрансАвто", "Каршеринг Плюс", "Парк Авто", "ДрайвПро",
        "МоторИнвест", "АвтоФлот", "СитиКар", "ПремиумДрайв", "ЭкоТранс",
        "РусАвто", "МегаПарк", "АвтоСтарт", "ЮгТранс", "СеверАвто",
        "ВостокЛизинг", "ЗападАвто", "ЦентрПарк", "АльфаМоторс", "БетаТранс"
    };

    private static readonly string[] Regions =
    { "77", "50", "78", "47", "16", "52", "63", "34", "23", "61", "54", "66", "02", "74", "59" };

    private static readonly char[] PlateLetters = { 'А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х' };

    [HttpPost]
    public async Task<IActionResult> Seed()
    {
        try
        {
        await ClearDemoData();

        var rng = new Random(123);
        var today = DateTime.Today;
        var from = today.AddDays(-44);

        // ── Owners (20) ──
        var owners = new List<Owner>();
        for (var i = 0; i < OwnerCompanies.Length; i++)
        {
            var prefix = i % 3 == 0 ? "ООО" : i % 3 == 1 ? "ИП" : "АО";
            owners.Add(new Owner
            {
                Name = $"ДЕМО {prefix} \"{OwnerCompanies[i]}\"",
                Inn = (7700000000L + i * 73 + rng.Next(100)).ToString(),
                Ogrn = (1027700000000L + i * 137).ToString(),
                Phone = GeneratePhone(rng),
                Email = $"demo.owner{i}@stax-test.ru",
                Comment = DemoTag,
                CreatedAt = from.AddDays(rng.Next(0, 10))
            });
        }
        _db.Owners.AddRange(owners);
        await _db.SaveChangesAsync();

        // ── Investors (160) — рост: медленно первые 2 недели, потом ускорение ──
        var investors = new List<Investor>();
        for (var i = 0; i < 160; i++)
        {
            // Экспоненциально-подобное распределение: больше инвесторов в последние дни
            var t = (double)i / 159;
            var dayOffset = (int)(Math.Pow(t, 0.6) * 44);

            var fn = FirstNames[rng.Next(FirstNames.Length)];
            var ln = LastNames[rng.Next(LastNames.Length)];
            var pn = Patronymics[rng.Next(Patronymics.Length)];

            investors.Add(new Investor
            {
                FirstName = fn,
                LastName = ln,
                Patronymic = pn,
                Phone = GeneratePhone(rng),
                Email = $"demo.inv{i}@stax-test.ru",
                Passport = $"{rng.Next(10, 99)} {rng.Next(10, 99)} {rng.Next(100000, 999999)}",
                Inn = (770000000000L + i * 100 + 1).ToString(),
                Comment = DemoTag,
                CreatedAt = from.AddDays(dayOffset)
            });
        }
        _db.Investors.AddRange(investors);
        await _db.SaveChangesAsync();

        // ── Cars (180) — равномерный рост с небольшими всплесками ──
        var cars = new List<Car>();
        for (var i = 0; i < 180; i++)
        {
            // Линейно + шум
            var dayOffset = Math.Min(44, (int)(i * 44.0 / 179 + rng.Next(-1, 2)));
            if (dayOffset < 0) dayOffset = 0;

            var model = CarModels[rng.Next(CarModels.Length)];
            var year = 2019 + rng.Next(0, 6);
            // Цена зависит от модели (премиум дороже)
            var basePrice = model.Contains("BMW") || model.Contains("Mercedes") || model.Contains("Audi") ||
                            model.Contains("Land Cruiser") || model.Contains("Tank") || model.Contains("Li Auto")
                ? rng.Next(3000, 8000) * 1000m
                : model.Contains("Lada") || model.Contains("Granta") || model.Contains("Logan")
                    ? rng.Next(800, 1800) * 1000m
                    : rng.Next(1500, 4000) * 1000m;

            var plate = $"{PlateLetters[rng.Next(PlateLetters.Length)]}" +
                        $"{rng.Next(100, 999)}" +
                        $"{PlateLetters[rng.Next(PlateLetters.Length)]}" +
                        $"{PlateLetters[rng.Next(PlateLetters.Length)]}" +
                        $"{Regions[rng.Next(Regions.Length)]}";

            cars.Add(new Car
            {
                MakeModel = model,
                PlateNumber = $"Д{plate}",
                Vin = $"DEMO{i:D4}{rng.Next(10000000, 99999999)}",
                Year = year,
                Color = (CarColor)rng.Next(0, 3),
                CarPrice = basePrice,
                MileageKm = rng.Next(0, 120000),
                OwnerId = owners[rng.Next(owners.Count)].Id,
                Comment = DemoTag,
                CreatedAt = from.AddDays(dayOffset)
            });
        }
        _db.Cars.AddRange(cars);
        await _db.SaveChangesAsync();

        // ── Investments (160) — каждая привязана к уникальной машине ──
        // PrincipalAmount <= CarPrice чтобы не нарушать триггер
        var investments = new List<Investment>();
        for (var i = 0; i < 160; i++)
        {
            var car = cars[i]; // 1 инвестиция на 1 машину
            var investor = investors[i];

            // Сумма инвестиции = 60-95% от стоимости авто
            var ratio = 0.6m + (decimal)rng.Next(0, 35) / 100m;
            var principal = Math.Round(car.CarPrice * ratio / 1000m) * 1000m;
            var rate = 12 + rng.Next(0, 13); // 12-24%
            var termMonths = new[] { 6, 12, 12, 18, 24 }[rng.Next(5)]; // чаще 12 месяцев
            var monthlyPayout = Math.Round(principal * rate / 100m / 12m, 2);
            var totalReturn = Math.Round(principal + principal * rate / 100m * termMonths / 12m, 2);

            // Инвестиции создаются через 0-3 дня после машины
            var invDate = car.CreatedAt.DateTime.AddDays(rng.Next(0, 4));
            if (invDate > today) invDate = today;

            // Большинство активных, немного закрытых и отменённых
            var status = InvestmentStatus.ACTIVE;
            if (i >= 140) status = InvestmentStatus.CLOSED;
            else if (i >= 150) status = InvestmentStatus.CANCELED;

            investments.Add(new Investment
            {
                InvestorId = investor.Id,
                CarId = car.Id,
                PrincipalAmount = principal,
                InterestRatePercent = rate,
                TermMonths = termMonths,
                RegularPayoutAmount = monthlyPayout,
                TotalReturnAmount = totalReturn,
                StartDate = invDate,
                Status = status,
                PayoutType = i % 10 == 0 ? PayoutType.QUARTERLY : PayoutType.MONTHLY,
                CreatedAt = invDate
            });
        }
        _db.Investments.AddRange(investments);
        await _db.SaveChangesAsync();

        // ── Payout Schedules + Payments ──
        var adminUser = await _db.Users.FirstAsync(u => u.Role == UserRole.ADMIN);
        var schedules = new List<PayoutSchedule>();

        foreach (var inv in investments)
        {
            var maxPeriods = Math.Min(inv.TermMonths, 6);
            for (var p = 1; p <= maxPeriods; p++)
            {
                var dueDate = inv.StartDate.AddMonths(p);
                schedules.Add(new PayoutSchedule
                {
                    InvestmentId = inv.Id,
                    PeriodNo = p,
                    DueDate = dueDate,
                    PlannedAmount = inv.RegularPayoutAmount,
                    Status = dueDate <= today ? ScheduleStatus.PAID : ScheduleStatus.PLANNED,
                    Comment = DemoTag,
                    CreatedAt = inv.StartDate
                });
            }
        }
        _db.PayoutSchedules.AddRange(schedules);
        await _db.SaveChangesAsync();

        // Платежи для прошедших графиков — с небольшим разбросом по датам
        var payments = new List<Payment>();
        foreach (var sch in schedules.Where(s => s.Status == ScheduleStatus.PAID))
        {
            // Платёж в день или +-2 дня от даты графика
            var paidDate = sch.DueDate.AddDays(rng.Next(-2, 3));
            if (paidDate > today) paidDate = today;

            payments.Add(new Payment
            {
                InvestmentId = sch.InvestmentId,
                ScheduleId = sch.Id,
                PaidAt = paidDate,
                Amount = sch.PlannedAmount,
                PaymentMethod = rng.Next(3) == 0 ? "Наличные" : "Перевод",
                Comment = DemoTag,
                CreatedByUserId = adminUser.Id,
                CreatedAt = paidDate
            });
        }
        _db.Payments.AddRange(payments);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"Создано: {owners.Count} компаний, {investors.Count} инвесторов, " +
                      $"{cars.Count} машин, {investments.Count} инвестиций, " +
                      $"{schedules.Count} графиков, {payments.Count} выплат"
        });
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = $"Ошибка генерации: {inner}" });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        try
        {
        var counts = await ClearDemoData();
        return Ok(new
        {
            message = $"Удалено: {counts.payments} выплат, {counts.schedules} графиков, " +
                      $"{counts.investments} инвестиций, {counts.cars} машин, " +
                      $"{counts.investors} инвесторов, {counts.owners} компаний"
        });
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = $"Ошибка удаления: {inner}" });
        }
    }

    private async Task<(int payments, int schedules, int investments, int cars, int investors, int owners)> ClearDemoData()
    {
        // 1. Payments
        var p1 = await _db.Payments.IgnoreQueryFilters().Where(p => p.Comment == DemoTag).ToListAsync();
        _db.Payments.RemoveRange(p1);
        await _db.SaveChangesAsync();

        // 2. Schedules
        var s1 = await _db.PayoutSchedules.IgnoreQueryFilters().Where(s => s.Comment == DemoTag).ToListAsync();
        _db.PayoutSchedules.RemoveRange(s1);
        await _db.SaveChangesAsync();

        // 3. Find demo investor ids
        var demoInvIds = await _db.Investors.IgnoreQueryFilters()
            .Where(i => i.Comment == DemoTag).Select(i => i.Id).ToListAsync();

        // 3a. Remaining payments/schedules linked to demo investments
        var demoInvestmentIds = await _db.Investments.IgnoreQueryFilters()
            .Where(i => demoInvIds.Contains(i.InvestorId)).Select(i => i.Id).ToListAsync();

        var p2 = await _db.Payments.IgnoreQueryFilters()
            .Where(p => demoInvestmentIds.Contains(p.InvestmentId)).ToListAsync();
        _db.Payments.RemoveRange(p2);
        await _db.SaveChangesAsync();

        var s2 = await _db.PayoutSchedules.IgnoreQueryFilters()
            .Where(s => demoInvestmentIds.Contains(s.InvestmentId)).ToListAsync();
        _db.PayoutSchedules.RemoveRange(s2);
        await _db.SaveChangesAsync();

        // 4. Investments
        var inv = await _db.Investments.IgnoreQueryFilters()
            .Where(i => demoInvIds.Contains(i.InvestorId)).ToListAsync();
        _db.Investments.RemoveRange(inv);
        await _db.SaveChangesAsync();

        // 5. Cars
        var c = await _db.Cars.IgnoreQueryFilters().Where(x => x.Comment == DemoTag).ToListAsync();
        _db.Cars.RemoveRange(c);
        await _db.SaveChangesAsync();

        // 6. Investors
        var i2 = await _db.Investors.IgnoreQueryFilters().Where(x => x.Comment == DemoTag).ToListAsync();
        _db.Investors.RemoveRange(i2);
        await _db.SaveChangesAsync();

        // 7. Owners
        var o = await _db.Owners.IgnoreQueryFilters().Where(x => x.Comment == DemoTag).ToListAsync();
        _db.Owners.RemoveRange(o);
        await _db.SaveChangesAsync();

        return (p1.Count + p2.Count, s1.Count + s2.Count, inv.Count, c.Count, i2.Count, o.Count);
    }

    private static string GeneratePhone(Random rng)
    {
        return $"+7 (9{rng.Next(10, 99)}) {rng.Next(100, 999)}-{rng.Next(10, 99)}-{rng.Next(10, 99)}";
    }
}
