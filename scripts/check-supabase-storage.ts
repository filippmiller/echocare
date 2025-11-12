/**
 * Script to check Supabase Storage buckets and files
 * Run with: npx tsx scripts/check-supabase-storage.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing Supabase configuration!");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkBuckets() {
  console.log("🔍 Checking Supabase Storage buckets...\n");

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error("❌ Error listing buckets:", error);
    return;
  }

  if (!buckets || buckets.length === 0) {
    console.log("⚠️  No buckets found!");
    return;
  }

  console.log(`✅ Found ${buckets.length} bucket(s):\n`);

  for (const bucket of buckets) {
    console.log(`📦 Bucket: ${bucket.name}`);
    console.log(`   Public: ${bucket.public ? "✅ Yes" : "❌ No"}`);
    console.log(`   Created: ${bucket.created_at}`);
    console.log(`   Updated: ${bucket.updated_at}`);

    // Check files in bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(bucket.name)
      .list("", {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (filesError) {
      console.log(`   ⚠️  Error listing files: ${filesError.message}`);
    } else if (files && files.length > 0) {
      console.log(`   📁 Files: ${files.length} (showing first 10)`);
      files.slice(0, 10).forEach((file) => {
        console.log(`      - ${file.name} (${(file.metadata?.size ?? 0) / 1024} KB)`);
      });
      if (files.length > 10) {
        console.log(`      ... and ${files.length - 10} more`);
      }
    } else {
      console.log(`   📁 Files: 0`);
    }

    console.log("");
  }
}

async function checkSpecificBuckets() {
  const requiredBuckets = ["avatars", "journal-audio"];

  console.log("🔍 Checking required buckets...\n");

  for (const bucketName of requiredBuckets) {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list("", {
        limit: 5,
        offset: 0,
      });

    if (error) {
      console.log(`❌ Bucket "${bucketName}": ${error.message}`);
    } else {
      console.log(`✅ Bucket "${bucketName}": ${files?.length ?? 0} files found`);
      if (files && files.length > 0) {
        files.forEach((file) => {
          console.log(`   - ${file.name}`);
        });
      }
    }
    console.log("");
  }
}

async function main() {
  console.log("🚀 Supabase Storage Check\n");
  console.log(`URL: ${supabaseUrl}\n`);

  await checkBuckets();
  await checkSpecificBuckets();

  console.log("✅ Check complete!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

