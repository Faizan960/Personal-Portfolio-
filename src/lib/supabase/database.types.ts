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
    PostgrestVersion: "17.1"
  }
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
      achievements: {
        Row: {
          context: string | null
          created_at: string
          date: string | null
          id: string
          is_visible: boolean
          name: string
          result: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          date?: string | null
          id: string
          is_visible?: boolean
          name: string
          result?: string | null
          sort_order: number
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          date?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          result?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          id: string
          is_visible: boolean
          issued: string | null
          issuer: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          id: string
          is_visible?: boolean
          issued?: string | null
          issuer?: string | null
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          id?: string
          is_visible?: boolean
          issued?: string | null
          issuer?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          award: string
          created_at: string
          current: boolean
          id: string
          institution: string | null
          is_visible: boolean
          location: string | null
          period: string | null
          qualification: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          award: string
          created_at?: string
          current?: boolean
          id: string
          institution?: string | null
          is_visible?: boolean
          location?: string | null
          period?: string | null
          qualification: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          award?: string
          created_at?: string
          current?: boolean
          id?: string
          institution?: string | null
          is_visible?: boolean
          location?: string | null
          period?: string | null
          qualification?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      education_details: {
        Row: {
          content: string
          education_id: string
          id: string
          sort_order: number
        }
        Insert: {
          content: string
          education_id: string
          id?: string
          sort_order: number
        }
        Update: {
          content?: string
          education_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "education_details_education_id_fkey"
            columns: ["education_id"]
            isOneToOne: false
            referencedRelation: "education"
            referencedColumns: ["id"]
          },
        ]
      }
      experience: {
        Row: {
          created_at: string
          current: boolean
          duration: string | null
          id: string
          is_visible: boolean
          location: string
          organisation: string
          period: string
          role: string
          sort_order: number
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current?: boolean
          duration?: string | null
          id: string
          is_visible?: boolean
          location: string
          organisation: string
          period: string
          role: string
          sort_order: number
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current?: boolean
          duration?: string | null
          id?: string
          is_visible?: boolean
          location?: string
          organisation?: string
          period?: string
          role?: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      experience_highlights: {
        Row: {
          content: string
          experience_id: string
          id: string
          sort_order: number
        }
        Insert: {
          content: string
          experience_id: string
          id?: string
          sort_order: number
        }
        Update: {
          content?: string
          experience_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "experience_highlights_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experience"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_technologies: {
        Row: {
          experience_id: string
          sort_order: number | null
          technology_id: string
        }
        Insert: {
          experience_id: string
          sort_order?: number | null
          technology_id: string
        }
        Update: {
          experience_id?: string
          sort_order?: number | null
          technology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_technologies_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experience"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      exploring_items: {
        Row: {
          caption: string
          created_at: string
          id: string
          index: string | null
          is_visible: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption: string
          created_at?: string
          id: string
          index?: string | null
          is_visible?: boolean
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          index?: string | null
          is_visible?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      globe_custom_edges: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          relationship_type: string
          sort_order: number | null
          source_id: string
          source_type: string
          strength: number | null
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          relationship_type: string
          sort_order?: number | null
          source_id: string
          source_type: string
          strength?: number | null
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          relationship_type?: string
          sort_order?: number | null
          source_id?: string
          source_type?: string
          strength?: number | null
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      globe_node_layouts: {
        Row: {
          color_override: string | null
          entity_id: string
          entity_type: string
          is_locked: boolean
          is_visible: boolean
          position_x: number | null
          position_y: number | null
          position_z: number | null
          radius: number | null
          sort_order: number | null
          style_preset: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color_override?: string | null
          entity_id: string
          entity_type: string
          is_locked?: boolean
          is_visible?: boolean
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          radius?: number | null
          sort_order?: number | null
          style_preset?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color_override?: string | null
          entity_id?: string
          entity_type?: string
          is_locked?: boolean
          is_visible?: boolean
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          radius?: number | null
          sort_order?: number | null
          style_preset?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      globe_settings: {
        Row: {
          core_label: string
          core_subtitle: string | null
          id: number
          layout_config: Json
          updated_at: string
          updated_by: string | null
          visual_config: Json
        }
        Insert: {
          core_label: string
          core_subtitle?: string | null
          id?: number
          layout_config?: Json
          updated_at?: string
          updated_by?: string | null
          visual_config?: Json
        }
        Update: {
          core_label?: string
          core_subtitle?: string | null
          id?: number
          layout_config?: Json
          updated_at?: string
          updated_by?: string | null
          visual_config?: Json
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          filename: string
          id: string
          is_published: boolean
          media_type: string | null
          mime_type: string | null
          original_filename: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          bucket_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          filename: string
          id?: string
          is_published?: boolean
          media_type?: string | null
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          bucket_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          filename?: string
          id?: string
          is_published?: boolean
          media_type?: string | null
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_settings: {
        Row: {
          about: Json
          contact: Json
          hero: Json
          id: number
          meta: Json
          nav_sections: Json
          personal: Json
          recognition: Json
          sections_config: Json
          social: Json
          statement_alternatives: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          about: Json
          contact: Json
          hero: Json
          id?: number
          meta: Json
          nav_sections: Json
          personal: Json
          recognition: Json
          sections_config?: Json
          social: Json
          statement_alternatives?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          about?: Json
          contact?: Json
          hero?: Json
          id?: number
          meta?: Json
          nav_sections?: Json
          personal?: Json
          recognition?: Json
          sections_config?: Json
          social?: Json
          statement_alternatives?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      publication_history: {
        Row: {
          action: string
          changed_sections: string[]
          id: string
          payload: Json
          published_at: string
          published_by: string | null
          published_by_email: string | null
          status: string
          summary: string | null
          version: number
        }
        Insert: {
          action: string
          changed_sections?: string[]
          id?: string
          payload: Json
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          status?: string
          summary?: string | null
          version: number
        }
        Update: {
          action?: string
          changed_sections?: string[]
          id?: string
          payload?: Json
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          status?: string
          summary?: string | null
          version?: number
        }
        Relationships: []
      }
      published_snapshots: {
        Row: {
          id: number
          notes: string | null
          payload: Json
          published_at: string
          published_by: string | null
          published_by_email: string | null
          version: number
        }
        Insert: {
          id?: number
          notes?: string | null
          payload: Json
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          version?: number
        }
        Update: {
          id?: number
          notes?: string | null
          payload?: Json
          published_at?: string
          published_by?: string | null
          published_by_email?: string | null
          version?: number
        }
        Relationships: []
      }
      project_skills: {
        Row: {
          project_id: string
          relationship_type: string
          skill_id: string
          sort_order: number | null
        }
        Insert: {
          project_id: string
          relationship_type?: string
          skill_id: string
          sort_order?: number | null
        }
        Update: {
          project_id?: string
          relationship_type?: string
          skill_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      project_technologies: {
        Row: {
          project_id: string
          sort_order: number
          technology_id: string
        }
        Insert: {
          project_id: string
          sort_order?: number
          technology_id: string
        }
        Update: {
          project_id?: string
          sort_order?: number
          technology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_technologies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: string
          created_at: string
          detail: Json
          featured: boolean
          full_title: string | null
          github: string | null
          id: string
          image: string | null
          index: string | null
          is_published: boolean
          live_url: string | null
          name: string
          sort_order: number
          status: string | null
          summary: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category: string
          created_at?: string
          detail: Json
          featured?: boolean
          full_title?: string | null
          github?: string | null
          id: string
          image?: string | null
          index?: string | null
          is_published?: boolean
          live_url?: string | null
          name: string
          sort_order: number
          status?: string | null
          summary: string
          updated_at?: string
          visibility: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: Json
          featured?: boolean
          full_title?: string | null
          github?: string | null
          id?: string
          image?: string | null
          index?: string | null
          is_published?: boolean
          live_url?: string | null
          name?: string
          sort_order?: number
          status?: string | null
          summary?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          caption: string | null
          created_at: string
          display_index: string | null
          id: string
          is_visible: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_index?: string | null
          id: string
          is_visible?: boolean
          label: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_index?: string | null
          id?: string
          is_visible?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_visible: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id: string
          is_visible?: boolean
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      technologies: {
        Row: {
          color_override: string | null
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          normalized_name: string
          updated_at: string
        }
        Insert: {
          color_override?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_visible?: boolean
          name: string
          normalized_name: string
          updated_at?: string
        }
        Update: {
          color_override?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          normalized_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_entity_exists: {
        Args: { p_id: string; p_type: string }
        Returns: boolean
      }
      publish_portfolio_snapshot: {
        Args: { p_changed_sections?: string[]; p_notes?: string | null }
        Returns: Json
      }
      rollback_portfolio_snapshot: {
        Args: { p_history_id: string }
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
