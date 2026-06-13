using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/colony-state")]
public class ColonyStateController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var state = await db.ColonyStates.FindAsync("singleton");
        return state is null ? NotFound() : Ok(state);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ColonyState state)
    {
        state.Id = "singleton";
        db.Entry(state).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(state);
    }
}
