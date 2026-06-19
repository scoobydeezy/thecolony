using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEffectValueAndCharacterState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecondaryTargetId",
                table: "EventEffects",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Value",
                table: "EventEffects",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "State",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecondaryTargetId",
                table: "EventEffects");

            migrationBuilder.DropColumn(
                name: "Value",
                table: "EventEffects");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Characters");
        }
    }
}
