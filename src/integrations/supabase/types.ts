export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown | null
          method: string
          request_size: number | null
          response_size: number | null
          response_status: number
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown | null
          method: string
          request_size?: number | null
          response_size?: number | null
          response_status: number
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          method?: string
          request_size?: number | null
          response_size?: number | null
          response_status?: number
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      business_notifications: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_sent: boolean | null
          location_id: string | null
          message: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          open_count: number | null
          recipient_count: number | null
          scheduled_time: string | null
          sent_time: string | null
          title: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          location_id?: string | null
          message: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          open_count?: number | null
          recipient_count?: number | null
          scheduled_time?: string | null
          sent_time?: string | null
          title: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          location_id?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          open_count?: number | null
          recipient_count?: number | null
          scheduled_time?: string | null
          sent_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_notifications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_description: string | null
          business_name: string
          business_type: string
          created_at: string | null
          id: string
          phone_number: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          updated_at: string | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
          website_url: string | null
        }
        Insert: {
          business_description?: string | null
          business_name: string
          business_type: string
          created_at?: string | null
          id?: string
          phone_number?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
          website_url?: string | null
        }
        Update: {
          business_description?: string | null
          business_name?: string
          business_type?: string
          created_at?: string | null
          id?: string
          phone_number?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_comment_id: string | null
          place_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          place_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          place_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          shared_content: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          shared_content?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          shared_content?: Json | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          resolved: boolean | null
          severity: string | null
          stack_trace: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          requested_id: string
          requester_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_requested_id_fkey"
            columns: ["requested_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_claims: {
        Row: {
          business_id: string | null
          claimed_at: string | null
          id: string
          location_id: string | null
          verification_documents: Json | null
          verification_status:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Insert: {
          business_id?: string | null
          claimed_at?: string | null
          id?: string
          location_id?: string | null
          verification_documents?: Json | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Update: {
          business_id?: string | null
          claimed_at?: string | null
          id?: string
          location_id?: string | null
          verification_documents?: Json | null
          verification_status?:
            | Database["public"]["Enums"]["business_verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "location_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_claims_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_likes: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_likes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          name: string
          pioneer_user_id: string | null
          place_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          pioneer_user_id?: string | null
          place_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          pioneer_user_id?: string | null
          place_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_pioneer_user_id_fkey"
            columns: ["pioneer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          caption: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          location_id: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_id: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          endpoint: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_unit: string
          metric_value: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_unit: string
          metric_value: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_unit?: string
          metric_value?: number
          user_id?: string | null
        }
        Relationships: []
      }
      place_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          place_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          place_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          place_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      place_likes: {
        Row: {
          created_at: string
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          likes_count: number | null
          location_id: string | null
          media_urls: string[]
          metadata: Json | null
          saves_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          location_id?: string | null
          media_urls: string[]
          metadata?: Json | null
          saves_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          location_id?: string | null
          media_urls?: string[]
          metadata?: Json | null
          saves_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_verified: boolean | null
          cities_visited: number | null
          created_at: string
          current_city: string | null
          email: string | null
          follower_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          is_business_user: boolean | null
          places_visited: number | null
          posts_count: number | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_verified?: boolean | null
          cities_visited?: number | null
          created_at?: string
          current_city?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id: string
          is_business_user?: boolean | null
          places_visited?: number | null
          posts_count?: number | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_verified?: boolean | null
          cities_visited?: number | null
          created_at?: string
          current_city?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          is_business_user?: boolean | null
          places_visited?: number | null
          posts_count?: number | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
        }
        Relationships: []
      }
      promoted_posts: {
        Row: {
          business_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          media_id: string | null
          promoted_at: string | null
          promotion_type: string | null
        }
        Insert: {
          business_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_id?: string | null
          promoted_at?: string | null
          promotion_type?: string | null
        }
        Update: {
          business_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_id?: string | null
          promoted_at?: string | null
          promotion_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoted_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoted_posts_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_places: {
        Row: {
          city: string | null
          coordinates: Json | null
          created_at: string
          id: string
          place_category: string | null
          place_id: string
          place_name: string
          user_id: string
        }
        Insert: {
          city?: string | null
          coordinates?: Json | null
          created_at?: string
          id?: string
          place_category?: string | null
          place_id: string
          place_name: string
          user_id: string
        }
        Update: {
          city?: string | null
          coordinates?: Json | null
          created_at?: string
          id?: string
          place_category?: string | null
          place_id?: string
          place_name?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          search_query: string
          search_type: string
          searched_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          search_query: string
          search_type: string
          searched_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          search_query?: string
          search_type?: string
          searched_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_places: {
        Row: {
          created_at: string
          id: string
          place_data: Json | null
          place_id: string
          place_name: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_data?: Json | null
          place_id: string
          place_name: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_data?: Json | null
          place_id?: string
          place_name?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          location_address: string | null
          location_id: string | null
          location_name: string | null
          media_type: string
          media_url: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          location_address?: string | null
          location_id?: string | null
          location_name?: string | null
          media_type: string
          media_url: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          location_address?: string | null
          location_id?: string | null
          location_name?: string | null
          media_type?: string
          media_url?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_users: {
        Row: {
          created_at: string | null
          id: string
          level: number | null
          points: number | null
          status: string
          total_contributions: number | null
          updated_at: string | null
          user_id: string
          weekly_contributions: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number | null
          points?: number | null
          status?: string
          total_contributions?: number | null
          updated_at?: string | null
          user_id: string
          weekly_contributions?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number | null
          points?: number | null
          status?: string
          total_contributions?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_contributions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "super_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          city: string | null
          country: string | null
          id: string
          latitude: number
          longitude: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          latitude: number
          longitude: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          allowed_types: Json | null
          business_id: string | null
          created_at: string | null
          geographic_radius: number | null
          id: string
          is_muted: boolean | null
          location_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_types?: Json | null
          business_id?: string | null
          created_at?: string | null
          geographic_radius?: number | null
          id?: string
          is_muted?: boolean | null
          location_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_types?: Json | null
          business_id?: string | null
          created_at?: string | null
          geographic_radius?: number | null
          id?: string
          is_muted?: boolean | null
          location_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          category: string
          id: string
          last_searched: string | null
          search_count: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          id?: string
          last_searched?: string | null
          search_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          id?: string
          last_searched?: string | null
          search_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_location_metrics: {
        Row: {
          created_at: string | null
          id: string
          likes_count: number | null
          location_id: string
          saves_count: number | null
          updated_at: string | null
          visits_count: number | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          likes_count?: number | null
          location_id: string
          saves_count?: number | null
          updated_at?: string | null
          visits_count?: number | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          likes_count?: number | null
          location_id?: string
          saves_count?: number | null
          updated_at?: string | null
          visits_count?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_location_metrics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_stories: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_location_of_the_week: {
        Args: Record<PropertyKey, never>
        Returns: {
          location_id: string
          location_name: string
          location_category: string
          location_address: string
          latitude: number
          longitude: number
          image_url: string
          total_likes: number
          total_saves: number
          total_score: number
        }[]
      }
    }
    Enums: {
      business_verification_status: "pending" | "verified" | "rejected"
      friend_request_status: "pending" | "accepted" | "declined" | "blocked"
      notification_type: "event" | "discount" | "announcement" | "special_offer"
      subscription_status: "active" | "inactive" | "trial" | "cancelled"
      user_type: "free" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_verification_status: ["pending", "verified", "rejected"],
      friend_request_status: ["pending", "accepted", "declined", "blocked"],
      notification_type: ["event", "discount", "announcement", "special_offer"],
      subscription_status: ["active", "inactive", "trial", "cancelled"],
      user_type: ["free", "business"],
    },
  },
} as const
