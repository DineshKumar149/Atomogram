import postgres from 'postgres';
import fs from 'fs';

const SOURCE_URL = 'postgresql://postgres:Dinesh%402729305@db.pyofwjdoptibhxueuhvy.supabase.co:5432/postgres';
const TARGET_URL = 'postgresql://postgres:Pranchi%406368@db.lwqqacrjszjujdimrbdz.supabase.co:5432/postgres';

const sourceDb = postgres(SOURCE_URL, { max: 1, idle_timeout: 10 });
const targetDb = postgres(TARGET_URL, { max: 1, idle_timeout: 10 });

async function run() {
  try {
    console.log("Applying schema...");
    const schemaSql = fs.readFileSync('supabase_schema.sql', 'utf8');
    // Use unsafe to run the entire SQL script
    await targetDb.unsafe(schemaSql);
    console.log("Schema applied.");

    console.log("Applying RLS fixes...");
    if (fs.existsSync('supabase_rls_fix.sql')) {
      const rlsFixSql = fs.readFileSync('supabase_rls_fix.sql', 'utf8');
      await targetDb.unsafe(rlsFixSql);
      console.log("RLS fixes applied.");
    }

    console.log("Disabling triggers on target...");
    await targetDb`SET session_replication_role = 'replica';`;

    const tables = [
      'auth.users',
      'auth.identities',
      'auth.sessions',
      'storage.buckets',
      'storage.objects',
      'public.profiles',
      'public.posts',
      'public.post_likes',
      'public.post_comments',
      'public.conversations',
      'public.conversation_participants',
      'public.messages',
      'public.message_reactions',
      'public.message_reads',
      'public.typing_indicators',
      'public.calls',
      'public.user_blocks',
      'public.notifications'
    ];

    for (const table of tables) {
      console.log(`Copying data for ${table}...`);
      const [schemaName, tableName] = table.split('.');
      const rows = await sourceDb`SELECT * FROM ${sourceDb(schemaName)}.${sourceDb(tableName)}`;
      
      if (rows.length > 0) {
        try {
          await targetDb`INSERT INTO ${targetDb(schemaName)}.${targetDb(tableName)} ${targetDb(rows)} ON CONFLICT DO NOTHING`;
          console.log(`Copied ${rows.length} rows to ${table}.`);
        } catch (err) {
          console.error(`Failed to copy to ${table}:`, err.message);
        }
      } else {
        console.log(`No data in ${table}.`);
      }
    }

    console.log("Re-enabling triggers on target...");
    await targetDb`SET session_replication_role = 'origin';`;
    
    console.log("✅ Database successfully cloned!");
  } catch (error) {
    console.error("Error during cloning:", error);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

run();
