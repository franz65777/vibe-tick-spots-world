export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          name: string
          pioneer_user_id: string | null
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
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          pioneer_user_id?: string | null
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
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          pioneer_user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_verification_status: "pending" | "verified" | "rejected"
      notification_type: "event" | "discount" | "announcement" | "special_offer"
      subscription_status: "active" | "inactive" | "trial" | "cancelled"
      user_type: "free" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_verification_status: ["pending", "verified", "rejected"],
      notification_type: ["event", "discount", "announcement", "special_offer"],
      subscription_status: ["active", "inactive", "trial", "cancelled"],
      user_type: ["free", "business"],
    },
  },
} as const
