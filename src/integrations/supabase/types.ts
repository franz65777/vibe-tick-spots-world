export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          method?: string
          request_size?: number | null
          response_size?: number | null
          response_status?: number
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          feature: string | null
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          feature?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          feature?: string | null
          id?: string
          user_id?: string
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
      business_claim_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_name: string
          business_type: string
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          location_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          business_type: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          business_type?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
            foreignKeyName: "business_profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          claim_request_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          next_billing_date: string | null
          plan_type: string
          price: number
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          claim_request_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type?: string
          price: number
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          claim_request_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type?: string
          price?: number
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_claim_request_id_fkey"
            columns: ["claim_request_id"]
            isOneToOne: false
            referencedRelation: "business_claim_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category: string | null
          challenge_type: string
          city: string | null
          created_at: string | null
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          reward_badge_id: string | null
          reward_points: number
          start_date: string
          target_action: string
          target_count: number
          title: string
        }
        Insert: {
          category?: string | null
          challenge_type: string
          city?: string | null
          created_at?: string | null
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          reward_badge_id?: string | null
          reward_points?: number
          start_date: string
          target_action: string
          target_count?: number
          title: string
        }
        Update: {
          category?: string | null
          challenge_type?: string
          city?: string | null
          created_at?: string | null
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          reward_badge_id?: string | null
          reward_points?: number
          start_date?: string
          target_action?: string
          target_count?: number
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          location_id: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          location_id?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          location_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
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
          location_id: string | null
          message_context: string | null
          message_type: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          shared_content: Json | null
          story_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          location_id?: string | null
          message_context?: string | null
          message_type?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          shared_content?: Json | null
          story_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          location_id?: string | null
          message_context?: string | null
          message_type?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          shared_content?: Json | null
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
      hidden_messages: {
        Row: {
          hidden_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_posts: {
        Row: {
          hidden_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          location_id: string
          user_id: string
          weight: number
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          location_id: string
          user_id: string
          weight?: number
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "interactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      location_rankings: {
        Row: {
          created_at: string
          id: string
          location_id: string
          score: number
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          score: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          score?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_rankings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_swipes: {
        Row: {
          created_at: string
          id: string
          location_id: string
          swiped_right: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          swiped_right?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          swiped_right?: boolean
          user_id?: string
        }
        Relationships: []
      }
      location_view_duration: {
        Row: {
          created_at: string
          duration_seconds: number
          google_place_id: string | null
          id: string
          location_id: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          google_place_id?: string | null
          id?: string
          location_id?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          google_place_id?: string | null
          id?: string
          location_id?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          category: string
          city: string | null
          claimed_by: string | null
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
          claimed_by?: string | null
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
          claimed_by?: string | null
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
      marketing_campaigns: {
        Row: {
          business_user_id: string
          campaign_type: string
          created_at: string
          description: string
          end_date: string
          id: string
          is_active: boolean
          location_id: string
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          business_user_id: string
          campaign_type: string
          created_at?: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean
          location_id: string
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          business_user_id?: string
          campaign_type?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean
          location_id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
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
      places_cache: {
        Row: {
          cache_key: string
          city: string | null
          created_at: string
          expires_at: string
          id: string
          latitude: number | null
          longitude: number | null
          query_text: string
          query_type: string
          radius_km: number | null
          results: Json
        }
        Insert: {
          cache_key: string
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          query_text: string
          query_type: string
          radius_km?: number | null
          results: Json
        }
        Update: {
          cache_key?: string
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          query_text?: string
          query_type?: string
          radius_km?: number | null
          results?: Json
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
      post_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          location_id: string | null
          post_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          location_id?: string | null
          post_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          location_id?: string | null
          post_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reviews_post_id_fkey"
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
      post_shares: {
        Row: {
          id: string
          post_id: string
          shared_at: string
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          shared_at?: string
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          shared_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
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
          content_type: string | null
          created_at: string
          id: string
          is_business_post: boolean | null
          likes_count: number | null
          location_id: string | null
          media_urls: string[]
          metadata: Json | null
          rating: number | null
          saves_count: number | null
          shares_count: number
          tagged_users: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_business_post?: boolean | null
          likes_count?: number | null
          location_id?: string | null
          media_urls: string[]
          metadata?: Json | null
          rating?: number | null
          saves_count?: number | null
          shares_count?: number
          tagged_users?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_business_post?: boolean | null
          likes_count?: number | null
          location_id?: string | null
          media_urls?: string[]
          metadata?: Json | null
          rating?: number | null
          saves_count?: number | null
          shares_count?: number
          tagged_users?: string[] | null
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
          invite_code: string | null
          invited_by: string | null
          invited_users_count: number | null
          is_business_user: boolean | null
          language: string
          last_username_change_at: string | null
          places_visited: number | null
          posts_count: number | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          username: string | null
          username_changes_count: number | null
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
          invite_code?: string | null
          invited_by?: string | null
          invited_users_count?: number | null
          is_business_user?: boolean | null
          language?: string
          last_username_change_at?: string | null
          places_visited?: number | null
          posts_count?: number | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          username_changes_count?: number | null
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
          invite_code?: string | null
          invited_by?: string | null
          invited_users_count?: number | null
          is_business_user?: boolean | null
          language?: string
          last_username_change_at?: string | null
          places_visited?: number | null
          posts_count?: number | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          username_changes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      reservations: {
        Row: {
          confirmation_code: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          location_id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          special_requests: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confirmation_code?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          location_id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          special_requests?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confirmation_code?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          location_id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          special_requests?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          is_available: boolean | null
          location_id: string
          max_party_size: number
          time_slot: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          is_available?: boolean | null
          location_id: string
          max_party_size?: number
          time_slot: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_available?: boolean | null
          location_id?: string
          max_party_size?: number
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          search_query: string
          search_type: string
          searched_at?: string | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          search_query?: string
          search_type?: string
          searched_at?: string | null
          target_user_id?: string | null
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
          location_name: string
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
          location_name: string
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
          location_name?: string
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
      story_likes: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      super_users: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          points: number | null
          status: string
          total_contributions: number | null
          updated_at: string | null
          user_id: string
          weekly_contributions: number | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          points?: number | null
          status?: string
          total_contributions?: number | null
          updated_at?: string | null
          user_id: string
          weekly_contributions?: number | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
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
      trip_locations: {
        Row: {
          created_at: string | null
          google_place_id: string | null
          id: string
          location_id: string | null
          notes: string | null
          order_index: number
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_index: number
          trip_id: string
        }
        Update: {
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_index?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          city: string
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city: string
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_count: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
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
      user_muted_locations: {
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
        Relationships: []
      }
      user_mutes: {
        Row: {
          created_at: string
          id: string
          is_muted: boolean
          muted_user_id: string
          muter_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_muted?: boolean
          muted_user_id: string
          muter_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_muted?: boolean
          muted_user_id?: string
          muter_id?: string
          updated_at?: string
        }
        Relationships: []
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
      user_recommendations: {
        Row: {
          category: string | null
          created_at: string | null
          friends_saved: number | null
          id: string
          location_id: string
          score: number
          total_saves: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          friends_saved?: number | null
          id?: string
          location_id: string
          score?: number
          total_saves?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          friends_saved?: number | null
          id?: string
          location_id?: string
          score?: number
          total_saves?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      username_changes: {
        Row: {
          changed_at: string
          id: string
          new_username: string
          old_username: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_username: string
          old_username: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_username?: string
          old_username?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "username_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trending_locations: {
        Row: {
          last_updated: string | null
          location_id: string | null
          previous_interactions: number | null
          recent_interactions: number | null
          trend_ratio: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_day1_retention: {
        Args: { end_date: string; start_date: string }
        Returns: {
          cohort_date: string
          retained_users: number
          retention_rate: number
          total_users: number
        }[]
      }
      calculate_day30_retention: {
        Args: { end_date: string; start_date: string }
        Returns: {
          cohort_date: string
          retained_users: number
          retention_rate: number
          total_users: number
        }[]
      }
      calculate_day7_retention: {
        Args: { end_date: string; start_date: string }
        Returns: {
          cohort_date: string
          retained_users: number
          retention_rate: number
          total_users: number
        }[]
      }
      check_auth_rate_limit: { Args: { user_ip: unknown }; Returns: boolean }
      check_challenge_completion: {
        Args: {
          action_city?: string
          action_type: string
          target_user_id: string
        }
        Returns: undefined
      }
      clean_city_name: { Args: { city_input: string }; Returns: string }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      cleanup_old_analytics: { Args: never; Returns: undefined }
      cleanup_sensitive_data: { Args: never; Returns: undefined }
      enforce_data_retention: { Args: never; Returns: undefined }
      generate_confirmation_code: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      get_anonymized_analytics: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          page_url: string
          session_id: string
        }[]
      }
      get_business_contact_info: {
        Args: { business_profile_id: string; requesting_user_id: string }
        Returns: {
          phone_number: string
          website_url: string
        }[]
      }
      get_city_engagement:
        | {
            Args: { p_city: string; p_user: string }
            Returns: {
              followed_users: Json
              total_pins: number
            }[]
          }
        | {
            Args: { p_city: string }
            Returns: {
              followed_users: Json
              total_pins: number
            }[]
          }
      get_city_engagement_geo: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_km: number
          p_user: string
        }
        Returns: {
          followed_users: Json
          total_pins: number
        }[]
      }
      get_dau: { Args: { target_date: string }; Returns: number }
      get_feature_usage: {
        Args: { end_date: string; start_date: string }
        Returns: {
          feature: string
          unique_users: number
          usage_count: number
        }[]
      }
      get_following_saved_locations: {
        Args: never
        Returns: {
          address: string
          category: string
          city: string
          created_at: string
          created_by: string
          id: string
          latitude: number
          longitude: number
          name: string
        }[]
      }
      get_following_saved_places: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          city: string
          coordinates: Json
          created_at: string
          place_category: string
          place_id: string
          place_name: string
          user_id: string
          username: string
        }[]
      }
      get_mau: { Args: { target_month: string }; Returns: number }
      get_pin_engagement: {
        Args: { p_google_place_id: string; p_location_id: string }
        Returns: {
          followed_users: Json
          total_saves: number
        }[]
      }
      get_public_business_data: {
        Args: { business_id: string }
        Returns: {
          business_description: string
          business_name: string
          business_type: string
          created_at: string
          id: string
          verification_status: Database["public"]["Enums"]["business_verification_status"]
        }[]
      }
      get_retention_by_city: {
        Args: { end_date: string; start_date: string }
        Returns: {
          city: string
          day1_rate: number
          day1_retained: number
          day7_rate: number
          day7_retained: number
          total_users: number
        }[]
      }
      get_safe_business_data: {
        Args: { business_id: string }
        Returns: {
          business_description: string
          business_name: string
          business_type: string
          created_at: string
          id: string
          verification_status: Database["public"]["Enums"]["business_verification_status"]
        }[]
      }
      get_safe_profile_data: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          business_verified: boolean
          cities_visited: number
          created_at: string
          current_city: string
          follower_count: number
          following_count: number
          id: string
          is_business_user: boolean
          places_visited: number
          posts_count: number
          user_type: Database["public"]["Enums"]["user_type"]
          username: string
        }[]
      }
      get_secure_messages: {
        Args: { other_user_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          receiver_id: string
          sender_id: string
        }[]
      }
      get_trending_data: {
        Args: never
        Returns: {
          last_updated: string
          location_id: string
          previous_interactions: number
          recent_interactions: number
          trend_ratio: number
        }[]
      }
      get_user_category_weights: {
        Args: { target_user_id: string }
        Returns: {
          category: string
          weight: number
        }[]
      }
      get_user_feed: {
        Args: { feed_limit?: number; target_user_id: string }
        Returns: {
          avatar_url: string
          content: string
          created_at: string
          event_type: string
          id: string
          location_id: string
          location_name: string
          media_url: string
          post_id: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_business: {
        Args: { business_user_id: string }
        Returns: boolean
      }
      refresh_trending_locations: { Args: never; Returns: undefined }
      search_users_safely: {
        Args: { requesting_user_id: string; search_query: string }
        Returns: {
          avatar_url: string
          bio: string
          follower_count: number
          following_count: number
          id: string
          is_following: boolean
          username: string
        }[]
      }
      search_users_securely: {
        Args: { requesting_user_id: string; search_query: string }
        Returns: {
          avatar_url: string
          bio: string
          follower_count: number
          following_count: number
          id: string
          is_following: boolean
          username: string
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_user_streak: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
      business_verification_status: ["pending", "verified", "rejected"],
      friend_request_status: ["pending", "accepted", "declined", "blocked"],
      notification_type: ["event", "discount", "announcement", "special_offer"],
      subscription_status: ["active", "inactive", "trial", "cancelled"],
      user_type: ["free", "business"],
    },
  },
} as const
