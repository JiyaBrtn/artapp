// Shared learner comment wall configuration.
//
// Leave both values empty to keep insights in this browser only.
// To share one wall with every visitor:
//   1. Create a free project at https://supabase.com
//   2. Run supabase-setup.sql in the project's SQL Editor
//   3. Open Project Settings -> API and copy:
//        - Project URL
//        - anon public key
//   4. Paste them below between the quotes, then save this file.
//
// The anon key is designed to be public. Row Level Security and the
// database functions in supabase-setup.sql protect the data.
// Never paste the service_role key here: it bypasses those protections.
window.COMMENT_WALL = {
  supabaseUrl: "https://loobzdzdjroxrfqolnxs.supabase.co/rest/v1/",
  supabaseAnonKey: "sb_publishable_R8Om-7YtGRor_SA4fTwuKA_l4kjUrSt",
  table: "insights",
  createFunction: "create_insight",
  deleteFunction: "delete_insight"
};
