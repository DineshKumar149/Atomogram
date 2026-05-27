import postgres from 'postgres';
import fs from 'fs';

const SOURCE_URL = 'postgresql://postgres:Dinesh%402729305@db.pyofwjdoptibhxueuhvy.supabase.co:5432/postgres';
const TARGET_URL = 'postgresql://postgres:Pranchi%406368@db.lwqqacrjszjujdimrbdz.supabase.co:5432/postgres';

const sourceDb = postgres(SOURCE_URL, { max: 1, idle_timeout: 10 });
const targetDb = postgres(TARGET_URL, { max: 1, idle_timeout: 10 });

async function run() {
  try {
    console.log("Disabling triggers on target...");
    await targetDb`SET session_replication_role = 'replica';`;

    const tables = [
      'auth.users',
      'auth.identities',
      'storage.objects'
    ];

    for (const table of tables) {
      console.log(`Copying data for ${table} (handling generated columns)...`);
      const [schemaName, tableName] = table.split('.');
      
      // Get only non-generated columns from the target database
      const colDefs = await targetDb`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = ${schemaName} 
          AND table_name = ${tableName} 
          AND is_generated = 'NEVER'
          AND identity_generation IS NULL
      `;
      const validCols = colDefs.map(c => c.column_name);
      
      const rows = await sourceDb`SELECT * FROM ${sourceDb(schemaName)}.${sourceDb(tableName)}`;
      
      if (rows.length > 0) {
        // filter rows to only contain valid columns
        const filteredRows = rows.map(row => {
          const newRow = {};
          for (const col of validCols) {
            if (row[col] !== undefined) {
              newRow[col] = row[col];
            }
          }
          return newRow;
        });

        const actualColsToInsert = Object.keys(filteredRows[0]);
        if (actualColsToInsert.length > 0) {
            try {
            await targetDb`INSERT INTO ${targetDb(schemaName)}.${targetDb(tableName)} ${targetDb(filteredRows, actualColsToInsert)} ON CONFLICT DO NOTHING`;
            console.log(`Copied ${filteredRows.length} rows to ${table}.`);
            } catch (err) {
            console.error(`Failed to copy to ${table}:`, err.message);
            }
        }
      } else {
        console.log(`No data in ${table}.`);
      }
    }

    console.log("Re-enabling triggers on target...");
    await targetDb`SET session_replication_role = 'origin';`;
    
    console.log("✅ Fix complete!");
  } catch (error) {
    console.error("Error during cloning:", error);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

run();
