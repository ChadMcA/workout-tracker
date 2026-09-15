import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";
config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const schemaPath = join(process.cwd(), "db", "schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  console.log("Applying schema.sql ...");
  await pool.query(sql);
  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
