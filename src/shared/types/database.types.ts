export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      broadcast_poll_options: {
        Row: {
          broadcast_id: string
          id: string
          label: string
          position: number
        }
        Insert: {
          broadcast_id: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          broadcast_id?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_poll_options_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_poll_votes: {
        Row: {
          broadcast_id: string
          created_at: string
          id: string
          option_id: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          id?: string
          option_id: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_poll_votes_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "broadcast_poll_options"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          author_id: string | null
          body: string
          community_id: string
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          community_id: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          avatar_url: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_count: number
          name: string
          slug: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_count?: number
          name: string
          slug: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          slug?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          subject_type: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          created_at: string
          flyer_id: string
          going_solo: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flyer_id: string
          going_solo?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flyer_id?: string
          going_solo?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_heat: {
        Row: {
          created_at: string
          event_id: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_heat_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media: {
        Row: {
          created_at: string
          flyer_id: string
          id: string
          media_type: string
          media_url: string
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          flyer_id: string
          id?: string
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          flyer_id?: string
          id?: string
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_media_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_qr_invites: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          display_name: string
          flyer_id: string
          id: string
          phone: string | null
          qr_token: string
          user_id: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          display_name: string
          flyer_id: string
          id?: string
          phone?: string | null
          qr_token?: string
          user_id: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          display_name?: string
          flyer_id?: string
          id?: string
          phone?: string | null
          qr_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_qr_invites_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string
          created_at: string
          currency: string
          date: string
          description: string | null
          expires_at: string | null
          external_url: string | null
          flyer_url: string
          heat_count: number | null
          id: string
          location: unknown
          price: number | null
          status: string
          time_end: string | null
          time_start: string
          title: string
          updated_at: string
          user_id: string
          venue_address: string
          venue_name: string
          views_count: number
        }
        Insert: {
          category_id: string
          created_at?: string
          currency?: string
          date: string
          description?: string | null
          expires_at?: string | null
          external_url?: string | null
          flyer_url: string
          heat_count?: number | null
          id?: string
          location: unknown
          price?: number | null
          status?: string
          time_end?: string | null
          time_start: string
          title: string
          updated_at?: string
          user_id: string
          venue_address: string
          venue_name: string
          views_count?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          expires_at?: string | null
          external_url?: string | null
          flyer_url?: string
          heat_count?: number | null
          id?: string
          location?: unknown
          price?: number | null
          status?: string
          time_end?: string | null
          time_start?: string
          title?: string
          updated_at?: string
          user_id?: string
          venue_address?: string
          venue_name?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_categories: {
        Row: {
          category_id: string
          flyer_id: string
        }
        Insert: {
          category_id: string
          flyer_id: string
        }
        Update: {
          category_id?: string
          flyer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyer_categories_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_extra_images: {
        Row: {
          created_at: string
          display_order: number
          flyer_id: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          flyer_id: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          flyer_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyer_extra_images_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_reports: {
        Row: {
          created_at: string | null
          flyer_id: string
          id: string
          reason: string
          reporter_id: string | null
        }
        Insert: {
          created_at?: string | null
          flyer_id: string
          id?: string
          reason: string
          reporter_id?: string | null
        }
        Update: {
          created_at?: string | null
          flyer_id?: string
          id?: string
          reason?: string
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flyer_reports_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      flyer_views: {
        Row: {
          flyer_id: string
          id: string
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          flyer_id: string
          id?: string
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          flyer_id?: string
          id?: string
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flyer_views_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      flyers: {
        Row: {
          address: string | null
          canvas_x: number
          canvas_y: number
          community_id: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          event_date: string | null
          event_time: string | null
          expires_at: string | null
          height: number
          id: string
          image_url: string
          is_promoted: boolean | null
          location: unknown
          promoted_until: string | null
          rotation: number
          social_copy: string | null
          status: string | null
          title: string | null
          user_id: string | null
          width: number
        }
        Insert: {
          address?: string | null
          canvas_x?: number
          canvas_y?: number
          community_id?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          height?: number
          id?: string
          image_url: string
          is_promoted?: boolean | null
          location?: unknown
          promoted_until?: string | null
          rotation?: number
          social_copy?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
          width?: number
        }
        Update: {
          address?: string | null
          canvas_x?: number
          canvas_y?: number
          community_id?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          height?: number
          id?: string
          image_url?: string
          is_promoted?: boolean | null
          location?: unknown
          promoted_until?: string | null
          rotation?: number
          social_copy?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "flyers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_configs: {
        Row: {
          created_at: string
          enabled: boolean
          flyer_id: string
          id: string
          max_capacity: number | null
          passcode_hash: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flyer_id: string
          id?: string
          max_capacity?: number | null
          passcode_hash: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flyer_id?: string
          id?: string
          max_capacity?: number | null
          passcode_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_configs_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: true
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_message_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_message_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          id: string
          phone: string | null
          push_token: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id: string
          phone?: string | null
          push_token?: string | null
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          push_token?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      saved_flyers: {
        Row: {
          created_at: string | null
          flyer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          flyer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          flyer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_flyers_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          terms_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          terms_version?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          category_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          geom: unknown
          id: string
          name: string
          priority: number
        }
        Insert: {
          geom: unknown
          id?: string
          name: string
          priority?: number
        }
        Update: {
          geom?: unknown
          id?: string
          name?: string
          priority?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkin_qr_invite: {
        Args: { p_qr_token: string }
        Returns: {
          already_checked_in: boolean
          checked_in_at: string
          display_name: string
          flyer_title: string
          phone: string
        }[]
      }
      create_community: {
        Args: {
          p_avatar_url?: string
          p_city?: string
          p_cover_url?: string
          p_description?: string
          p_name: string
          p_slug: string
          p_zone_id?: string
        }
        Returns: {
          avatar_url: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_count: number
          name: string
          slug: string
          updated_at: string
          zone_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "communities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      flyer_attendance_counts: {
        Args: { p_flyer_id: string }
        Returns: {
          solo_count: number
          total_count: number
        }[]
      }
      get_invitation_status: {
        Args: { p_flyer_id: string }
        Returns: {
          current_count: number
          enabled: boolean
          max_capacity: number
        }[]
      }
      get_nearby_events: {
        Args: {
          category_filter?: string
          radius_meters?: number
          result_limit?: number
          result_offset?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          currency: string
          date: string
          description: string
          distance_meters: number
          expires_at: string
          external_url: string
          flyer_url: string
          heat_count: number
          id: string
          location: string
          price: number
          status: string
          time_end: string
          time_start: string
          title: string
          updated_at: string
          user_id: string
          venue_address: string
          venue_name: string
          views_count: number
        }[]
      }
      get_or_create_conversation: {
        Args: { p_subject_id: string; p_subject_type: string }
        Returns: {
          created_at: string
          id: string
          subject_id: string
          subject_type: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_stats: { Args: { target_user_id: string }; Returns: Json }
      get_zone_name: { Args: { lat: number; lng: number }; Returns: string }
      increment_view_count: { Args: { event_id: string }; Returns: undefined }
      nearby_flyers: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          canvas_x: number
          canvas_y: number
          created_at: string
          description: string
          distance_m: number
          duration_days: number
          event_date: string
          event_time: string
          expires_at: string
          height: number
          id: string
          image_url: string
          is_promoted: boolean
          location: unknown
          promoted_until: string
          rotation: number
          social_copy: string
          status: string
          title: string
          user_id: string
          width: number
          zone_name: string
        }[]
      }
      nearby_flyers_scored: {
        Args: {
          radius_km?: number
          result_limit?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          address: string
          canvas_x: number
          canvas_y: number
          created_at: string
          description: string
          distance_m: number
          distance_score: number
          duration_days: number
          event_date: string
          event_time: string
          expires_at: string
          height: number
          id: string
          image_url: string
          interaction_score: number
          is_promoted: boolean
          location: unknown
          promoted_until: string
          rotation: number
          social_copy: string
          status: string
          time_score: number
          title: string
          total_score: number
          user_id: string
          width: number
          zone_name: string
        }[]
      }
      promote_community_member: {
        Args: { p_community_id: string; p_role: string; p_user_id: string }
        Returns: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "community_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_invitation_config: {
        Args: {
          p_enabled?: boolean
          p_flyer_id: string
          p_max_capacity?: number
          p_passcode: string
        }
        Returns: undefined
      }
      toggle_event_heat: { Args: { p_event_id: string }; Returns: Json }
      verify_and_get_invite: {
        Args: {
          p_display_name: string
          p_flyer_id: string
          p_passcode: string
          p_phone?: string
        }
        Returns: {
          already_existed: boolean
          display_name: string
          qr_token: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

