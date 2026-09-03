export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'
export type Platform = 'youtube' | 'tiktok' | 'instagram'
export type CollectPlatform = 'instagram' | 'threads' | 'tiktok' | 'douyin' | 'xiaohongshu'
export type CollectStatus =
  | 'collected'
  | 'analysis'
  | 'editing'
  | 'ready'
  | 'failed'
  | 'scheduled'
  | 'uploaded'
export type PerformanceGrade = 'explosion' | 'strong' | 'excellent' | 'normal' | 'weak'

export interface CollectedPost {
  id: string
  user_id: string
  platform: CollectPlatform
  post_id: string
  url: string | null
  author: string | null
  author_id: string | null
  caption: string | null
  thumbnail_url: string | null
  media_url: string | null
  views: number
  likes: number
  comments: number
  shares: number
  reposts: number
  quotes: number
  followers: number
  engagement_rate: number | null
  views_per_hour: number | null
  spread: number | null
  multiplier: number | null
  grade: PerformanceGrade | null
  status: CollectStatus
  collected_by: string | null
  collected_at: string
}

export interface ConnectedAccount {
  id: string
  user_id: string
  platform: 'threads'
  username: string
  display_name: string | null
  intro: string | null
  topics: string[]
  created_at: string
}
export type VideoType = 'long' | 'short'
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'scheduled'

export interface User {
  id: string
  email: string
  name: string
  username?: string
  image?: string
  status: UserStatus
  role: UserRole
  created_at: string
}

export interface PlatformConnection {
  id: string
  user_id: string
  platform: Platform
  access_token: string
  refresh_token?: string
  expires_at?: string
  channel_name: string
  channel_id: string
  created_at: string
}

export interface Upload {
  id: string
  user_id: string
  title: string
  description: string
  tags: string[]
  type: VideoType
  platforms: Platform[]
  status: UploadStatus
  platform_statuses: Record<Platform, UploadStatus>
  platform_urls: Record<Platform, string>
  scheduled_at?: string
  file_url?: string
  thumbnail_url?: string
  created_at: string
}

export interface Template {
  id: string
  user_id: string
  name: string
  description_format: string
  default_tags: string[]
  created_at: string
}

export interface UploadFormData {
  type: VideoType
  platforms: Platform[]
  title: string
  description: string
  tags: string[]
  thumbnailFile?: File
  videoFile?: File
  visibility: 'public' | 'unlisted' | 'private'
  scheduledAt?: string
}

export interface PlatformCardProps {
  platform: Platform
  isSelected: boolean
  isConnected: boolean
  onToggle: () => void
}
