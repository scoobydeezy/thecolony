using ColonyTracker.Api.Controllers;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §16: the book's editor saves whole files with the app's guarantees, and the
// app reads the result immediately (one source, no drift).
public class ContentEditorTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();

    public ContentEditorTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = "c1", Name = "Test" });
        db.Characters.Add(new Character { Id = "guid-celia", CampaignId = "c1", Name = "Celia Harthwright", Summary = "Caretaker." });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    [Fact]
    public void A_book_edit_is_what_the_app_reads()
    {
        var f = _canon.Store.ReadFile("npcs/celia-harthwright.md");
        var edited = f.Text.Replace("summary: Caretaker.", "summary: Caretaker of the Hall.") + "\n## Notes\n\nWritten in the book.\n";
        _canon.Store.WriteFile(f.Path, edited, f.Version, create: false);
        using var db = _canon.Db(_conn);
        Assert.Equal("Caretaker of the Hall.", db.Characters.Single().Summary);
        // The version check: a second save with the old version is refused.
        Assert.Throws<CanonConflictException>(() => _canon.Store.WriteFile(f.Path, f.Text, f.Version, create: false));
    }

    [Theory]
    [InlineData("../secrets.md", "outside")]
    [InlineData("npcs/celia-harthwright.txt", "only .md and .yaml")]
    [InlineData("nowhere/x.md", "not a content folder")]
    public void Paths_are_checked(string path, string message)
    {
        var ex = Assert.ThrowsAny<Exception>(() => _canon.Store.WriteFile(path, "---\nid: x\n---\n", null, create: true));
        Assert.Contains(message, ex.Message);
    }

    [Fact]
    public void An_invalid_or_renamed_entry_is_refused()
    {
        var f = _canon.Store.ReadFile("npcs/celia-harthwright.md");
        Assert.Contains("the id can't change", Assert.Throws<CanonValidationException>(() =>
            _canon.Store.WriteFile(f.Path, f.Text.Replace("id: npc.celia-harthwright", "id: npc.celia"), f.Version, false)).Message);
        Assert.Contains("schema", Assert.Throws<CanonValidationException>(() =>
            _canon.Store.WriteFile(f.Path, f.Text.Replace("name: Celia Harthwright", "name: Celia Harthwright\nshoeSize: 9"), f.Version, false)).Message);
        Assert.Contains("not valid YAML", Assert.Throws<CanonValidationException>(() =>
            _canon.Store.WriteFile(f.Path, f.Text.Replace("name: Celia Harthwright", "name: [unclosed"), f.Version, false)).Message);
        Assert.Equal(f.Text, File.ReadAllText(Path.Combine(_canon.Dir, f.Path)));   // nothing written
    }

    [Fact]
    public void New_entries_and_pages_get_allocated_ids_and_a_book_only_entry_can_be_deleted()
    {
        var (path, text) = _canon.Store.NewFile("rule", "Keeper's Ward");
        Assert.Equal("rules/keeper-s-ward.md", path);
        Assert.Contains("id: rule.keeper-s-ward\n", text);
        // A rule needs a version: the schema says so, and the template doesn't guess it.
        Assert.Throws<CanonValidationException>(() => _canon.Store.WriteFile(path, text, null, create: true));
        var saved = _canon.Store.WriteFile(path, text.Replace("status: stub\n", "status: stub\nversion: 1\n"), null, create: true);
        Assert.Equal("rule.keeper-s-ward", saved.Id);
        Assert.Throws<CanonConflictException>(() => _canon.Store.WriteFile(path, saved.Text, null, create: true));   // exists
        _canon.Store.DeleteFile(path, saved.Version);
        Assert.False(File.Exists(Path.Combine(_canon.Dir, path)));

        var page = _canon.Store.NewFile("docs", "Safety Tools", "running");
        Assert.Equal(("docs/running/safety-tools.md", "---\ntitle: Safety Tools\n---\n\n"), page);
        Assert.Contains("needs a title", Assert.Throws<CanonValidationException>(() => _canon.Store.WriteFile(page.Path, "---\nsidebar: {}\n---\n", null, true)).Message);
    }

    [Fact]
    public async Task Deleting_an_app_entry_from_the_book_removes_its_rows()
    {
        using var db = _canon.Db(_conn);
        var controller = new ContentController(db, _canon.Store);
        var f = _canon.Store.ReadFile("npcs/celia-harthwright.md");
        await controller.Delete(f.Path, f.Version);
        Assert.Empty(db.Characters.ToList());
        Assert.False(File.Exists(Path.Combine(_canon.Dir, f.Path)));
    }
}
