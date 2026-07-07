-- Squash migration history patch
-- Run this against colony.db (and colony-data/colony.db) after squashing migrations.
-- Replaces the 8 old migration entries with the single new one.

DELETE FROM "__EFMigrationsHistory";

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260705154838_InitialCreate', '10.0.9');
