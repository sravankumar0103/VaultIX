/* ===============================
   Bookmark Domain Types
================================= */

export type ImportanceLevel = 1 | 2 | 3
  

export interface Bookmark {
  id: string
  user_id: string
  title: string
  url: string | null
  description?: string
  domain?: string
  category?: string
  priority?: number | null
  media_url?: string | null
  tags?: string[]
  is_archived?: boolean
  created_at?: string
  updated_at?: string
}
