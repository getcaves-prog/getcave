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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
          created_at: string
          duration_days: number | null
          expires_at: string | null
          height: number
          id: string
          image_url: string
          is_promoted: boolean | null
          location: unknown
          promoted_until: string | null
          rotation: number
          status: string | null
          title: string | null
          user_id: string | null
          width: number
        }
        Insert: {
          address?: string | null
          canvas_x?: number
          canvas_y?: number
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          height?: number
          id?: string
          image_url: string
          is_promoted?: boolean | null
          location?: unknown
          promoted_until?: string | null
          rotation?: number
          status?: string | null
          title?: string | null
          user_id?: string | null
          width?: number
        }
        Update: {
          address?: string | null
          canvas_x?: number
          canvas_y?: number
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          height?: number
          id?: string
          image_url?: string
          is_promoted?: boolean | null
          location?: unknown
          promoted_until?: string | null
          rotation?: number
          status?: string | null
          title?: string | null
          user_id?: string | null
          width?: number
        }
        Relationships: []
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
      terms_acceptances: {
        Row: {
          id: string
          user_id: string
          accepted_at: string
          terms_version: string
        }
        Insert: {
          id?: string
          user_id: string
          accepted_at?: string
          terms_version?: string
        }
        Update: {
          id?: string
          user_id?: string
          accepted_at?: string
          terms_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_user_stats: { Args: { target_user_id: string }; Returns: Json }
      increment_view_count: { Args: { event_id: string }; Returns: undefined }
      nearby_flyers: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string | null
          canvas_x: number
          canvas_y: number
          created_at: string
          duration_days: number | null
          expires_at: string | null
          height: number
          id: string
          image_url: string
          is_promoted: boolean | null
          location: unknown
          promoted_until: string | null
          rotation: number
          status: string | null
          title: string | null
          user_id: string | null
          width: number
        }[]
        SetofOptions: {
          from: "*"
          to: "flyers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      toggle_event_heat: { Args: { p_event_id: string }; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const
