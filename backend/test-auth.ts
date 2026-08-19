import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@erp.test",
    password: "Password123!",
  });

  if (error) {
    console.error("Couldn't login:");
    console.error(error);
    process.exit(1);
  }

  console.log("\nLogged in");
  console.log("\nAccess token:\n");
  console.log(data.session?.access_token);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});