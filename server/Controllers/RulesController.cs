using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/rules")]
public class RulesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var rules = await db.RulesConfigs.FindAsync("singleton");
        return rules is null ? NotFound() : Ok(rules);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] RulesConfig rules)
    {
        rules.Id = "singleton";
        db.Entry(rules).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(rules);
    }
}
