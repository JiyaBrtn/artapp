# Shared Learner Insight Wall (Supabase)

The **SHARE** section works in two modes:

- **No keys configured** — insights are stored in the visitor's browser (`localStorage`).
- **Supabase configured** — every visitor reads and posts to the same shared wall.

## One-time setup

1. Create a free project at <https://supabase.com>.
2. In the project, open **SQL Editor → New query**.
3. Paste the whole of `supabase-setup.sql` and press **Run**.
   This creates the `insights` table, Row Level Security, and the two safe
   posting/deleting functions.
4. Open **Project Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (or the newer **publishable** key)
5. Open `comments-config.js` and paste them:

   ```js
   window.COMMENT_WALL = {
     supabaseUrl: "https://abcdefgh.supabase.co",
     supabaseAnonKey: "eyJhbGciOi...",
     table: "insights",
     createFunction: "create_insight",
     deleteFunction: "delete_insight"
   };
   ```

6. Save the file and hard-refresh the site (**Ctrl + Shift + R**).

Never paste the **service_role** key into this file. It bypasses security.
The anon/publishable key is meant to be public.

## How moderation works

- Posts appear immediately (`approved = true`).
- In **Table Editor → insights**, set `approved = false` to hide a post, or
  delete the row to remove it.
- The public site only reads `approved = true` rows.
- Visitors can delete only posts made from their own browser, using a private
  token kept in that browser. The database stores only its SHA-256 hash.

## Notes

- The wall refreshes automatically every 30 seconds while the tab is visible.
  The **Refresh** button forces an update.
- The last successful list is cached, so the wall still shows something if the
  connection drops. Posting while offline keeps the typed text and shows an
  error instead of losing it.
- Without keys, the site remains fully offline and comments stay on one device.
