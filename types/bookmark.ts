/* ===============================
   Bookmark Domain Types
================================= */

export interface Bookmark {
  id: string
  user_id: string // nullable in the table until 20261125_02 validates; RLS only returns the caller's own rows
  title: string
  url: string | null
  description: string | null
  domain: string | null
  category: string | null
  priority: number | null // CHECK 1..3 after 20261125_04
  media_url: string | null
  tags: string[] | null
  is_archived: boolean | null
  created_at: string | null
  updated_at: string | null
  visit_count?: number | null // unused by the app and not selected (V-100); optional so the select can omit it
}
