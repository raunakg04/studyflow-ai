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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          course: string
          created_at: string
          day: number
          end_hour: number
          ends_at: string | null
          external_id: string | null
          id: string
          kind: string
          location: string
          rationale: string
          source: string
          start_hour: number
          starts_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          course?: string
          created_at?: string
          day?: number
          end_hour?: number
          ends_at?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          location?: string
          rationale?: string
          source?: string
          start_hour?: number
          starts_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          course?: string
          created_at?: string
          day?: number
          end_hour?: number
          ends_at?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          location?: string
          rationale?: string
          source?: string
          start_hour?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          account_label: string
          created_at: string
          id: string
          last_sync_error: string | null
          last_synced_at: string | null
          provider: string
          settings: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          provider: string
          settings?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          provider?: string
          settings?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: Json
          break_minutes: number
          commitments: Json
          completed: boolean
          connected: Json
          created_at: string
          focus_minutes: number
          id: string
          name: string
          rhythm: string
          school: string
          timezone: string
          updated_at: string
        }
        Insert: {
          availability?: Json
          break_minutes?: number
          commitments?: Json
          completed?: boolean
          connected?: Json
          created_at?: string
          focus_minutes?: number
          id: string
          name?: string
          rhythm?: string
          school?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          availability?: Json
          break_minutes?: number
          commitments?: Json
          completed?: boolean
          connected?: Json
          created_at?: string
          focus_minutes?: number
          id?: string
          name?: string
          rhythm?: string
          school?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          actual_minutes: number | null
          completed_at: string | null
          course: string
          created_at: string
          ends_at: string
          id: string
          origin: string
          rationale: string
          starts_at: string
          status: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
          user_modified: boolean
        }
        Insert: {
          actual_minutes?: number | null
          completed_at?: string | null
          course?: string
          created_at?: string
          ends_at: string
          id?: string
          origin?: string
          rationale?: string
          starts_at: string
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          user_modified?: boolean
        }
        Update: {
          actual_minutes?: number | null
          completed_at?: string | null
          course?: string
          created_at?: string
          ends_at?: string
          id?: string
          origin?: string
          rationale?: string
          starts_at?: string
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          user_modified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_preferences: {
        Row: {
          allow_weekends: boolean
          available_days: number[]
          break_minutes: number
          buffer_minutes: number
          created_at: string
          focus_minutes: number
          id: string
          max_daily_study_minutes: number
          planning_horizon_days: number
          study_window_end: string
          study_window_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_weekends?: boolean
          available_days?: number[]
          break_minutes?: number
          buffer_minutes?: number
          created_at?: string
          focus_minutes?: number
          id?: string
          max_daily_study_minutes?: number
          planning_horizon_days?: number
          study_window_end?: string
          study_window_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_weekends?: boolean
          available_days?: number[]
          break_minutes?: number
          buffer_minutes?: number
          created_at?: string
          focus_minutes?: number
          id?: string
          max_daily_study_minutes?: number
          planning_horizon_days?: number
          study_window_end?: string
          study_window_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          bucket: string
          course: string
          created_at: string
          description: string
          due: string | null
          due_at: string | null
          due_label: string
          effort_hours: number
          estimated_minutes: number | null
          external_id: string | null
          id: string
          priority: number
          source: string
          status: string
          subtasks: Json
          suggestions: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: string
          course?: string
          created_at?: string
          description?: string
          due?: string | null
          due_at?: string | null
          due_label?: string
          effort_hours?: number
          estimated_minutes?: number | null
          external_id?: string | null
          id?: string
          priority?: number
          source?: string
          status?: string
          subtasks?: Json
          suggestions?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          course?: string
          created_at?: string
          description?: string
          due?: string | null
          due_at?: string | null
          due_label?: string
          effort_hours?: number
          estimated_minutes?: number | null
          external_id?: string | null
          id?: string
          priority?: number
          source?: string
          status?: string
          subtasks?: Json
          suggestions?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
