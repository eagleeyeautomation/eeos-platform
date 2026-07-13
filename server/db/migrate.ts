import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { closeDatabasePool, withTransaction } from "./postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const migrationsDir = path.resolve(__dirname, "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  await withTransaction(async (client) => {
    await client.query(`
      create table if not exists eeos_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    for (const file of files) {
      const existing = await client.query("select id from eeos_migrations where id = $1", [file]);

      if (existing.rows.length > 0) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query("insert into eeos_migrations (id) values ($1)", [file]);
      console.log(JSON.stringify({ level: "info", event: "migration.applied", migration: file }));
    }
  });
}

migrate()
  .catch((error) => {
    console.error(JSON.stringify({ level: "error", event: "migration.failed", message: error.message }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });
