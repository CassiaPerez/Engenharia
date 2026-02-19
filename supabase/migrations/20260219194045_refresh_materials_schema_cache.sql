/*
  # Refresh Materials Schema Cache

  Force Supabase to reload the materials table schema to recognize the normalized columns
  and clear any cached references to the old json_content structure.
*/

-- Force schema cache refresh by notifying the schema cache
NOTIFY pgrst, 'reload schema';
