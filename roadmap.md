# Roadmap — migrate rdx-secure-share

- [ ] Apply source migrations (shared_items, item_views) byte-for-byte
- [ ] Create private storage bucket `shared-files`
- [ ] Copy all repo files into project (exclude .git, .env, .lovable, bun.lock)
- [ ] Install added deps (@supabase/supabase-js, leaflet, @types/leaflet)
- [ ] Rebuild missing home page (upload → share link) at /
- [ ] Build admin portal at /admin using adminGetDashboard + ViewerMap
- [ ] Ask user to set ADMIN_PASSCODE secret
- [ ] Verify: upload text → open /v/<token> → track view → admin portal shows it
- [ ] Request old data export (records pending)
