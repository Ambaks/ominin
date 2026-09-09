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
      admin_users: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      call_throttle: {
        Row: {
          called_at: string
          table_id: string
        }
        Insert: {
          called_at?: string
          table_id: string
        }
        Update: {
          called_at?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_throttle_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
          name: string
          position: number
          tagline: string | null
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
          name: string
          position: number
          tagline?: string | null
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
          name?: string
          position?: number
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_posts: {
        Row: {
          attempt: number
          captions: Json
          created_at: string
          id: string
          platforms: string[]
          provider_request_id: string | null
          published_at: string | null
          results: Json | null
          status: Database["public"]["Enums"]["clip_post_status"]
          storage_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          attempt?: number
          captions: Json
          created_at?: string
          id?: string
          platforms: string[]
          provider_request_id?: string | null
          published_at?: string | null
          results?: Json | null
          status?: Database["public"]["Enums"]["clip_post_status"]
          storage_path?: string | null
          title: string
          user_id: string
        }
        Update: {
          attempt?: number
          captions?: Json
          created_at?: string
          id?: string
          platforms?: string[]
          provider_request_id?: string | null
          published_at?: string | null
          results?: Json | null
          status?: Database["public"]["Enums"]["clip_post_status"]
          storage_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      clip_profiles: {
        Row: {
          created_at: string
          provider_username: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_username: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_username?: string
          user_id?: string
        }
        Relationships: []
      }
      collect_pending: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "collect_pending_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          locale: string
          message: string
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          locale?: string
          message: string
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          locale?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json
          restaurant_id: string
          title: string | null
          type: Database["public"]["Enums"]["crm_activity_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          restaurant_id: string
          title?: string | null
          type: Database["public"]["Enums"]["crm_activity_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          restaurant_id?: string
          title?: string | null
          type?: Database["public"]["Enums"]["crm_activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_appointments: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          google_event_id: string | null
          id: string
          location: string | null
          notes: string | null
          restaurant_id: string
          start_at: string
          status: Database["public"]["Enums"]["crm_appointment_status"]
          title: string
          type: Database["public"]["Enums"]["crm_appointment_type"]
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          restaurant_id: string
          start_at: string
          status?: Database["public"]["Enums"]["crm_appointment_status"]
          title: string
          type?: Database["public"]["Enums"]["crm_appointment_type"]
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          restaurant_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["crm_appointment_status"]
          title?: string
          type?: Database["public"]["Enums"]["crm_appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_appointments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_decision_maker: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          restaurant_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_decision_maker?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_decision_maker?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          restaurant_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          estimated_value: number | null
          id: string
          last_contact_at: string | null
          lost_reason: string | null
          next_follow_up_at: string | null
          priority: Database["public"]["Enums"]["crm_priority"]
          restaurant_id: string
          status: Database["public"]["Enums"]["crm_lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          next_follow_up_at?: string | null
          priority?: Database["public"]["Enums"]["crm_priority"]
          restaurant_id: string
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          next_follow_up_at?: string | null
          priority?: Database["public"]["Enums"]["crm_priority"]
          restaurant_id?: string
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_restaurant_tags: {
        Row: {
          restaurant_id: string
          tag_id: string
        }
        Insert: {
          restaurant_id: string
          tag_id: string
        }
        Update: {
          restaurant_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_restaurant_tags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_restaurant_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_restaurants: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["crm_restaurant_category"]
          city: string | null
          created_at: string
          cuisine: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          external_id: string | null
          google_maps_url: string | null
          id: string
          important_notes: string | null
          instagram_url: string | null
          latitude: number | null
          longitude: number | null
          menu_url: string | null
          name: string
          outreach_opted_out_at: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          phone: string | null
          phone_normalized: string | null
          postal_code: string | null
          slug: string
          source: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["crm_restaurant_category"]
          city?: string | null
          created_at?: string
          cuisine?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          external_id?: string | null
          google_maps_url?: string | null
          id?: string
          important_notes?: string | null
          instagram_url?: string | null
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name: string
          outreach_opted_out_at?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          phone_normalized?: string | null
          postal_code?: string | null
          slug: string
          source?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["crm_restaurant_category"]
          city?: string | null
          created_at?: string
          cuisine?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          external_id?: string | null
          google_maps_url?: string | null
          id?: string
          important_notes?: string | null
          instagram_url?: string | null
          latitude?: number | null
          longitude?: number | null
          menu_url?: string | null
          name?: string
          outreach_opted_out_at?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          phone_normalized?: string | null
          postal_code?: string | null
          slug?: string
          source?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          priority: Database["public"]["Enums"]["crm_priority"]
          restaurant_id: string | null
          status: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["crm_priority"]
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["crm_priority"]
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["crm_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      etablissement_settings: {
        Row: {
          etablissement_id: string
          features: Json
          updated_at: string
        }
        Insert: {
          etablissement_id: string
          features?: Json
          updated_at?: string
        }
        Update: {
          etablissement_id?: string
          features?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etablissement_settings_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: true
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      etablissements: {
        Row: {
          address: string
          collect_slot_capacity: number
          cover_image: string | null
          created_at: string
          admin_pin_set: boolean
          google_review_url: string | null
          hours: string
          id: string
          name: string
          offre: Database["public"]["Enums"]["offre"] | null
          online_payment: boolean
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          phone: string
          siret: string | null
          slug: string
          tagline: string
        }
        Insert: {
          address?: string
          collect_slot_capacity?: number
          cover_image?: string | null
          created_at?: string
          admin_pin_set?: boolean
          google_review_url?: string | null
          hours?: string
          id?: string
          name: string
          offre?: Database["public"]["Enums"]["offre"] | null
          online_payment?: boolean
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          phone?: string
          siret?: string | null
          slug: string
          tagline?: string
        }
        Update: {
          address?: string
          collect_slot_capacity?: number
          cover_image?: string | null
          created_at?: string
          admin_pin_set?: boolean
          google_review_url?: string | null
          hours?: string
          id?: string
          name?: string
          offre?: Database["public"]["Enums"]["offre"] | null
          online_payment?: boolean
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          phone?: string
          siret?: string | null
          slug?: string
          tagline?: string
        }
        Relationships: []
      }
      formules: {
        Row: {
          created_at: string
          description: string | null
          disponible: boolean
          etablissement_id: string
          etapes: Json
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          disponible?: boolean
          etablissement_id: string
          etapes?: Json
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          disponible?: boolean
          etablissement_id?: string
          etapes?: Json
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "formules_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          etablissement_id: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          created_at?: string
          email: string
          etablissement_id: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          created_at?: string
          email?: string
          etablissement_id?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      item_printers: {
        Row: {
          item_id: string
          printer_id: string
        }
        Insert: {
          item_id: string
          printer_id: string
        }
        Update: {
          item_id?: string
          printer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_printers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_printers_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          badges: Database["public"]["Enums"]["badge"][]
          category_id: string
          created_at: string
          description: string | null
          detail: string | null
          disponible: boolean
          etablissement_id: string
          id: string
          image: string | null
          name: string
          options: Json
          pairing: string | null
          price: number
          stock: number | null
          vat_rate: number
        }
        Insert: {
          badges?: Database["public"]["Enums"]["badge"][]
          category_id: string
          created_at?: string
          description?: string | null
          detail?: string | null
          disponible?: boolean
          etablissement_id: string
          id?: string
          image?: string | null
          name: string
          options?: Json
          pairing?: string | null
          price: number
          stock?: number | null
          vat_rate?: number
        }
        Update: {
          badges?: Database["public"]["Enums"]["badge"][]
          category_id?: string
          created_at?: string
          description?: string | null
          detail?: string | null
          disponible?: boolean
          etablissement_id?: string
          id?: string
          image?: string | null
          name?: string
          options?: Json
          pairing?: string | null
          price?: number
          stock?: number | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_etablissement_id_fkey"
            columns: ["category_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "etablissement_id"]
          },
          {
            foreignKeyName: "items_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          etablissement_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          etablissement_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          etablissement_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          appel_serveur: boolean
          commande_annulee: boolean
          commande_prete: boolean
          etablissement_id: string
          nouvelle_commande: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appel_serveur?: boolean
          commande_annulee: boolean
          commande_prete: boolean
          etablissement_id: string
          nouvelle_commande: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appel_serveur?: boolean
          commande_annulee?: boolean
          commande_prete?: boolean
          etablissement_id?: string
          nouvelle_commande?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_etablissement_id_fkey"
            columns: ["user_id", "etablissement_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["user_id", "etablissement_id"]
          },
        ]
      }
      omilink_devices: {
        Row: {
          created_at: string
          discovered_printers: string[]
          etablissement_id: string
          hostname: string | null
          id: string
          last_seen_at: string | null
          name: string
          scan_requested_at: string | null
          scanned_at: string | null
          serial: string | null
          version: string | null
        }
        Insert: {
          created_at?: string
          discovered_printers?: string[]
          etablissement_id: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name: string
          scan_requested_at?: string | null
          scanned_at?: string | null
          serial?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string
          discovered_printers?: string[]
          etablissement_id?: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
          scan_requested_at?: string | null
          scanned_at?: string | null
          serial?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omilink_devices_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      omilink_enrollments: {
        Row: {
          created_at: string
          hostname: string | null
          lan_ip: string | null
          last_seen_at: string
          public_ip: string | null
          serial: string
          token_hash: string
          version: string | null
        }
        Insert: {
          created_at?: string
          hostname?: string | null
          lan_ip?: string | null
          last_seen_at?: string
          public_ip?: string | null
          serial: string
          token_hash: string
          version?: string | null
        }
        Update: {
          created_at?: string
          hostname?: string | null
          lan_ip?: string | null
          last_seen_at?: string
          public_ip?: string | null
          serial?: string
          token_hash?: string
          version?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          item_id: string | null
          name: string
          options: Json
          order_id: string
          paid_at: string | null
          paid_mode: Database["public"]["Enums"]["payment_mode"] | null
          quantity: number
          served_at: string | null
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          name: string
          options?: Json
          order_id: string
          paid_at?: string | null
          paid_mode?: Database["public"]["Enums"]["payment_mode"] | null
          quantity: number
          served_at?: string | null
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          id?: string
          item_id?: string | null
          name?: string
          options?: Json
          order_id?: string
          paid_at?: string | null
          paid_mode?: Database["public"]["Enums"]["payment_mode"] | null
          quantity?: number
          served_at?: string | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_change: number | null
          cash_given: number | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          estimated_ready_at: string | null
          etablissement_id: string
          id: string
          paid_online: boolean
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at: string | null
          staff_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          sumup_checkout_id: string | null
          table_id: string | null
          tip_amount: number | null
          type: Database["public"]["Enums"]["order_type"]
        }
        Insert: {
          cash_change?: number | null
          cash_given?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_ready_at?: string | null
          etablissement_id: string
          id?: string
          paid_online?: boolean
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          sumup_checkout_id?: string | null
          table_id?: string | null
          tip_amount?: number | null
          type?: Database["public"]["Enums"]["order_type"]
        }
        Update: {
          cash_change?: number | null
          cash_given?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          estimated_ready_at?: string | null
          etablissement_id?: string
          id?: string
          paid_online?: boolean
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          sumup_checkout_id?: string | null
          table_id?: string | null
          tip_amount?: number | null
          type?: Database["public"]["Enums"]["order_type"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_etablissement_id_fkey"
            columns: ["table_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id", "etablissement_id"]
          },
        ]
      }
      outreach_emails: {
        Row: {
          approved_at: string | null
          body_text: string | null
          classification:
            | Database["public"]["Enums"]["outreach_classification"]
            | null
          created_at: string
          direction: Database["public"]["Enums"]["outreach_email_direction"]
          error: string | null
          from_email: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          in_reply_to: string | null
          kind: string
          lead_id: string | null
          metadata: Json
          received_at: string | null
          restaurant_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["outreach_email_status"]
          subject: string | null
          to_email: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          body_text?: string | null
          classification?:
            | Database["public"]["Enums"]["outreach_classification"]
            | null
          created_at?: string
          direction: Database["public"]["Enums"]["outreach_email_direction"]
          error?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          in_reply_to?: string | null
          kind?: string
          lead_id?: string | null
          metadata?: Json
          received_at?: string | null
          restaurant_id: string
          sent_at?: string | null
          status: Database["public"]["Enums"]["outreach_email_status"]
          subject?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          body_text?: string | null
          classification?:
            | Database["public"]["Enums"]["outreach_classification"]
            | null
          created_at?: string
          direction?: Database["public"]["Enums"]["outreach_email_direction"]
          error?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          in_reply_to?: string | null
          kind?: string
          lead_id?: string | null
          metadata?: Json
          received_at?: string | null
          restaurant_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["outreach_email_status"]
          subject?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_emails_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "outreach_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_prospects: {
        Row: {
          ai_notes: string | null
          created_at: string
          disqualify_reason: string | null
          email_source: string | null
          enriched_at: string | null
          has_digital_menu: boolean | null
          priority_score: number | null
          qualification: string
          restaurant_id: string
          site_excerpt: string | null
          updated_at: string
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          disqualify_reason?: string | null
          email_source?: string | null
          enriched_at?: string | null
          has_digital_menu?: boolean | null
          priority_score?: number | null
          qualification?: string
          restaurant_id: string
          site_excerpt?: string | null
          updated_at?: string
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          disqualify_reason?: string | null
          email_source?: string | null
          enriched_at?: string | null
          has_digital_menu?: boolean | null
          priority_score?: number | null
          qualification?: string
          restaurant_id?: string
          site_excerpt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_prospects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          job: string
          started_at: string
          stats: Json
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Relationships: []
      }
      outreach_suppressions: {
        Row: {
          created_at: string
          email: string
          reason: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_suppressions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "crm_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_variants: {
        Row: {
          created_at: string
          hypothesis: string
          id: string
          name: string
          parent_variant_id: string | null
          prompt_rules: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hypothesis: string
          id?: string
          name: string
          parent_variant_id?: string | null
          prompt_rules: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hypothesis?: string
          id?: string
          name?: string
          parent_variant_id?: string | null
          prompt_rules?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_variants_parent_variant_id_fkey"
            columns: ["parent_variant_id"]
            isOneToOne: false
            referencedRelation: "outreach_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          charges_enabled: boolean
          etablissement_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          etablissement_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          etablissement_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: true
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
          kind: Database["public"]["Enums"]["print_job_kind"]
          order_id: string | null
          printed_at: string | null
          printer_id: string
          status: Database["public"]["Enums"]["print_job_status"]
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
          kind: Database["public"]["Enums"]["print_job_kind"]
          order_id?: string | null
          printed_at?: string | null
          printer_id: string
          status?: Database["public"]["Enums"]["print_job_status"]
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["print_job_kind"]
          order_id?: string | null
          printed_at?: string | null
          printer_id?: string
          status?: Database["public"]["Enums"]["print_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          checked_at: string | null
          created_at: string
          device_id: string
          etablissement_id: string
          host: string
          id: string
          last_error: string | null
          name: string
          port: number
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          device_id: string
          etablissement_id: string
          host: string
          id?: string
          last_error?: string | null
          name: string
          port?: number
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          device_id?: string
          etablissement_id?: string
          host?: string
          id?: string
          last_error?: string | null
          name?: string
          port?: number
        }
        Relationships: [
          {
            foreignKeyName: "printers_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "omilink_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notified: {
        Row: {
          event: string
          notified_at: string
          order_id: string
        }
        Insert: {
          event: string
          notified_at?: string
          order_id: string
        }
        Update: {
          event?: string
          notified_at?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notified_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          etablissement_id: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          etablissement_id: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          etablissement_id?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_etablissement_id_fkey"
            columns: ["user_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["user_id", "etablissement_id"]
          },
        ]
      }
      admin_pins: {
        Row: {
          etablissement_id: string
          pin_hash: string
          updated_at: string
        }
        Insert: {
          etablissement_id: string
          pin_hash: string
          updated_at?: string
        }
        Update: {
          etablissement_id?: string
          pin_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_pins_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: true
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
          name: string
          planning_token: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
          name: string
          planning_token?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
          name?: string
          planning_token?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          ends_at: string
          etablissement_id: string
          id: string
          note: string | null
          starts_at: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          etablissement_id: string
          id?: string
          note?: string | null
          starts_at: string
          staff_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          etablissement_id?: string
          id?: string
          note?: string | null
          starts_at?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          name: string
          shop_id: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_conversations: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          last_message_at: string
          order_id: string | null
          shop_id: string
          status: string
          subject: string | null
          unread_customer: boolean
          unread_shop: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          last_message_at?: string
          order_id?: string | null
          shop_id: string
          status?: string
          subject?: string | null
          unread_customer?: boolean
          unread_shop?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          last_message_at?: string
          order_id?: string | null
          shop_id?: string
          status?: string
          subject?: string | null
          unread_customer?: boolean
          unread_shop?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_conversations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_discount_codes: {
        Row: {
          code: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_subtotal_cents: number | null
          shop_id: string
          starts_at: string | null
          type: Database["public"]["Enums"]["shop_discount_type"]
          uses: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_subtotal_cents?: number | null
          shop_id: string
          starts_at?: string | null
          type: Database["public"]["Enums"]["shop_discount_type"]
          uses?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_subtotal_cents?: number | null
          shop_id?: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["shop_discount_type"]
          uses?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_discount_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_faq_items: {
        Row: {
          answer: string
          id: string
          is_active: boolean
          question: string
          shop_id: string
          sort_order: number
        }
        Insert: {
          answer: string
          id?: string
          is_active?: boolean
          question: string
          shop_id: string
          sort_order?: number
        }
        Update: {
          answer?: string
          id?: string
          is_active?: boolean
          question?: string
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_faq_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["shop_member_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          role: Database["public"]["Enums"]["shop_member_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["shop_member_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: Database["public"]["Enums"]["shop_message_sender"]
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: Database["public"]["Enums"]["shop_message_sender"]
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: Database["public"]["Enums"]["shop_message_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "shop_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "shop_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          shop_id: string
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          shop_id: string
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          shop_id?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_newsletter_subscribers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_option_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          shop_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_option_groups_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_option_values: {
        Row: {
          group_id: string
          id: string
          is_available: boolean
          label: string
          price_delta_cents: number
          sort_order: number
        }
        Insert: {
          group_id: string
          id?: string
          is_available?: boolean
          label: string
          price_delta_cents?: number
          sort_order?: number
        }
        Update: {
          group_id?: string
          id?: string
          is_available?: boolean
          label?: string
          price_delta_cents?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_option_values_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "shop_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_counters: {
        Row: {
          next_value: number
          shop_id: string
        }
        Insert: {
          next_value?: number
          shop_id: string
        }
        Update: {
          next_value?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_counters_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          order_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          id: string
          image_url: string | null
          options: Json
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string | null
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          options?: Json
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          id?: string
          image_url?: string | null
          options?: Json
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_notes: string | null
          billing_address: Json | null
          cancelled_at: string | null
          carrier: string | null
          created_at: string
          currency: string
          customer_note: string | null
          delivered_at: string | null
          discount_cents: number
          discount_code: string | null
          email: string
          first_name: string | null
          gift_message: string | null
          id: string
          is_gift: boolean
          last_name: string | null
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["shop_payment_status"]
          phone: string | null
          platform_fee_cents: number
          relay_point: Json | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_kind:
            | Database["public"]["Enums"]["shop_shipping_kind"]
            | null
          shipping_method_id: string | null
          shipping_method_name: string | null
          shop_id: string
          status: Database["public"]["Enums"]["shop_order_status"]
          stripe_account_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          total_cents: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          billing_address?: Json | null
          cancelled_at?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount_cents?: number
          discount_code?: string | null
          email: string
          first_name?: string | null
          gift_message?: string | null
          id?: string
          is_gift?: boolean
          last_name?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["shop_payment_status"]
          phone?: string | null
          platform_fee_cents?: number
          relay_point?: Json | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_kind?:
            | Database["public"]["Enums"]["shop_shipping_kind"]
            | null
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["shop_order_status"]
          stripe_account_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          total_cents: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          billing_address?: Json | null
          cancelled_at?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount_cents?: number
          discount_code?: string | null
          email?: string
          first_name?: string | null
          gift_message?: string | null
          id?: string
          is_gift?: boolean
          last_name?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["shop_payment_status"]
          phone?: string | null
          platform_fee_cents?: number
          relay_point?: Json | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_kind?:
            | Database["public"]["Enums"]["shop_shipping_kind"]
            | null
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["shop_order_status"]
          stripe_account_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shipping_method_id_shop_id_fkey"
            columns: ["shipping_method_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "shop_shipping_methods"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_payment_accounts: {
        Row: {
          charges_enabled: boolean
          details_submitted: boolean
          payouts_enabled: boolean
          shop_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          details_submitted?: boolean
          payouts_enabled?: boolean
          shop_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          details_submitted?: boolean
          payouts_enabled?: boolean
          shop_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_payment_accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_images: {
        Row: {
          alt: string | null
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_options: {
        Row: {
          group_id: string
          id: string
          is_required: boolean
          label: string
          product_id: string
          shop_id: string
          sort_order: number
        }
        Insert: {
          group_id: string
          id?: string
          is_required?: boolean
          label: string
          product_id: string
          shop_id: string
          sort_order?: number
        }
        Update: {
          group_id?: string
          id?: string
          is_required?: boolean
          label?: string
          product_id?: string
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_options_group_id_shop_id_fkey"
            columns: ["group_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "shop_option_groups"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "shop_product_options_product_id_shop_id_fkey"
            columns: ["product_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id", "shop_id"]
          },
        ]
      }
      shop_products: {
        Row: {
          badge: Database["public"]["Enums"]["shop_product_badge"] | null
          category_id: string | null
          compare_at_price_cents: number | null
          composition: string[]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price_cents: number
          seo_description: string | null
          seo_title: string | null
          shop_id: string
          slug: string
          sort_order: number
          stock: number | null
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          badge?: Database["public"]["Enums"]["shop_product_badge"] | null
          category_id?: string | null
          compare_at_price_cents?: number | null
          composition?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_cents: number
          seo_description?: string | null
          seo_title?: string | null
          shop_id: string
          slug: string
          sort_order?: number
          stock?: number | null
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          badge?: Database["public"]["Enums"]["shop_product_badge"] | null
          category_id?: string | null
          compare_at_price_cents?: number | null
          composition?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_cents?: number
          seo_description?: string | null
          seo_title?: string | null
          shop_id?: string
          slug?: string
          sort_order?: number
          stock?: number | null
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_shop_id_fkey"
            columns: ["category_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_shipping_methods: {
        Row: {
          carrier: string | null
          countries: string[]
          created_at: string
          delay_max_days: number | null
          delay_min_days: number | null
          description: string | null
          free_above_cents: number | null
          id: string
          instructions: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["shop_shipping_kind"]
          name: string
          price_cents: number
          shop_id: string
          sort_order: number
        }
        Insert: {
          carrier?: string | null
          countries?: string[]
          created_at?: string
          delay_max_days?: number | null
          delay_min_days?: number | null
          description?: string | null
          free_above_cents?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["shop_shipping_kind"]
          name: string
          price_cents?: number
          shop_id: string
          sort_order?: number
        }
        Update: {
          carrier?: string | null
          countries?: string[]
          created_at?: string
          delay_max_days?: number | null
          delay_min_days?: number | null
          description?: string | null
          free_above_cents?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["shop_shipping_kind"]
          name?: string
          price_cents?: number
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_shipping_methods_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_subscriptions: {
        Row: {
          setup_paid_at: string | null
          shop_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          setup_paid_at?: string | null
          shop_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          setup_paid_at?: string | null
          shop_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          about_text: string | null
          announcement: string | null
          catalog_label: string
          cgv: string | null
          confidentialite: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          free_shipping_threshold_cents: number | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          legal_address: string | null
          legal_company_name: string | null
          legal_email: string | null
          legal_siret: string | null
          legal_vat: string | null
          livraison_retours: string | null
          logo_url: string | null
          mentions_legales: string | null
          name: string
          order_prefix: string
          platform_fee_percent: number
          share_image_url: string | null
          slug: string
          tagline: string | null
          theme: Json
          tiktok_url: string | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          announcement?: string | null
          catalog_label?: string
          cgv?: string | null
          confidentialite?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          free_shipping_threshold_cents?: number | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          legal_address?: string | null
          legal_company_name?: string | null
          legal_email?: string | null
          legal_siret?: string | null
          legal_vat?: string | null
          livraison_retours?: string | null
          logo_url?: string | null
          mentions_legales?: string | null
          name: string
          order_prefix: string
          platform_fee_percent?: number
          share_image_url?: string | null
          slug: string
          tagline?: string | null
          theme?: Json
          tiktok_url?: string | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          announcement?: string | null
          catalog_label?: string
          cgv?: string | null
          confidentialite?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          free_shipping_threshold_cents?: number | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          legal_address?: string | null
          legal_company_name?: string | null
          legal_email?: string | null
          legal_siret?: string | null
          legal_vat?: string | null
          livraison_retours?: string | null
          logo_url?: string | null
          mentions_legales?: string | null
          name?: string
          order_prefix?: string
          platform_fee_percent?: number
          share_image_url?: string | null
          slug?: string
          tagline?: string | null
          theme?: Json
          tiktok_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          etablissement_id: string
          product: Database["public"]["Enums"]["product"]
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          etablissement_id: string
          product?: Database["public"]["Enums"]["product"]
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          etablissement_id?: string
          product?: Database["public"]["Enums"]["product"]
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      sumup_accounts: {
        Row: {
          access_token: string
          access_token_expires_at: string
          etablissement_id: string
          merchant_code: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          etablissement_id: string
          merchant_code: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          etablissement_id?: string
          merchant_code?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sumup_accounts_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: true
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      table_groups: {
        Row: {
          created_at: string
          etablissement_id: string
          id: string
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          id?: string
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_groups_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          etablissement_id: string
          group_id: string | null
          id: string
          number: number
          staff_id: string | null
        }
        Insert: {
          etablissement_id: string
          group_id?: string | null
          id?: string
          number: number
          staff_id?: string | null
        }
        Update: {
          etablissement_id?: string
          group_id?: string | null
          id?: string
          number?: number
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          created_by: string | null
          edited_at: string | null
          edited_by: string | null
          ended_at: string | null
          etablissement_id: string
          id: string
          member_name: string
          signature_in: string
          signature_out: string | null
          staff_id: string | null
          started_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          ended_at?: string | null
          etablissement_id: string
          id?: string
          member_name: string
          signature_in: string
          signature_out?: string | null
          staff_id: string
          started_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          ended_at?: string | null
          etablissement_id?: string
          id?: string
          member_name?: string
          signature_in?: string
          signature_out?: string | null
          staff_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      shop_customer_stats: {
        Row: {
          email: string | null
          first_order_at: string | null
          last_order_at: string | null
          name: string | null
          orders_count: number | null
          shop_id: string | null
          total_spent_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_collect_order: {
        Args: { p_pending_id: string; p_stripe_session_id: string }
        Returns: string
      }
      create_etablissement: {
        Args: {
          p_address?: string
          p_name: string
          p_offre?: Database["public"]["Enums"]["offre"]
          p_siret?: string
          p_slug: string
          p_table_count?: number
        }
        Returns: string
      }
      create_shop: {
        Args: { p_name: string; p_order_prefix: string; p_slug: string }
        Returns: string
      }
      crm_find_duplicates: {
        Args: {
          p_city?: string
          p_email?: string
          p_lat?: number
          p_lng?: number
          p_name: string
          p_phone?: string
        }
        Returns: {
          city: string
          name: string
          reason: string
          restaurant_id: string
        }[]
      }
      crm_recompute_follow_up: { Args: { p_lead: string }; Returns: undefined }
      current_member_role: {
        Args: { etab: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      current_shop_role: {
        Args: { p_shop: string }
        Returns: Database["public"]["Enums"]["shop_member_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      group_tables: {
        Args: { p_table_ids: string[] }
        Returns: string
      }
      mark_order_paid_online: {
        Args: { p_order_id: string; p_tip?: number | null }
        Returns: undefined
      }
      member_etablissements: { Args: never; Returns: string[] }
      omilink_claim_device: {
        Args: { p_serial: string; p_etablissement_id: string; p_name: string }
        Returns: string
      }
      omilink_provision_device: {
        Args: { p_etablissement_id: string; p_name: string }
        Returns: string
      }
      pay_order_items: {
        Args: {
          p_cash_change?: number | null
          p_cash_given?: number | null
          p_items: Json
          p_mode: Database["public"]["Enums"]["payment_mode"]
          p_tip?: number | null
        }
        Returns: undefined
      }
      place_order: {
        Args: { p_items: Json; p_slug: string; p_table_number: number }
        Returns: string
      }
      reorder_categories: { Args: { p_ids: string[] }; Returns: undefined }
      serve_order_items: { Args: { p_item_ids: string[] }; Returns: undefined }
      set_admin_pin: {
        Args: { p_code: string; p_etablissement_id: string }
        Returns: undefined
      }
      staff_planning: {
        Args: { p_from: string; p_to: string; p_token: string }
        Returns: Json
      }
      ungroup_tables: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      verify_admin_pin: {
        Args: { p_code: string; p_etablissement_id: string }
        Returns: boolean
      }
      shop_decrement_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: undefined
      }
      shop_increment_discount_uses: {
        Args: { p_code: string; p_shop: string }
        Returns: undefined
      }
      shop_sales_by_day: {
        Args: { p_days: number; p_shop: string }
        Returns: {
          day: string
          orders_count: number
          revenue_cents: number
        }[]
      }
    }
    Enums: {
      badge: "maison" | "top" | "nouveau"
      clip_post_status: "en_cours" | "publie" | "partiel" | "echec"
      crm_activity_type:
        | "note"
        | "call"
        | "email"
        | "visit"
        | "whatsapp"
        | "appointment"
        | "demo"
        | "follow_up"
        | "status_change"
      crm_appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
      crm_appointment_type: "visit" | "demo" | "signing" | "follow_up" | "other"
      crm_lead_status:
        | "new"
        | "to_contact"
        | "contacted"
        | "interested"
        | "visited"
        | "appointment_scheduled"
        | "proposal"
        | "negotiation"
        | "signed"
        | "lost"
        | "not_interested"
        | "no_email"
      crm_priority: "low" | "medium" | "high"
      crm_restaurant_category:
        | "restaurant"
        | "fast_food"
        | "cafe"
        | "bar"
        | "bakery"
        | "pizzeria"
        | "brasserie"
        | "hotel_restaurant"
        | "other"
      crm_task_status: "open" | "done" | "cancelled"
      member_role: "gerant" | "cuisinier" | "serveur"
      offre: "digital" | "smart" | "connect"
      order_status:
        | "en_attente"
        | "en_preparation"
        | "prete"
        | "servie"
        | "payee"
        | "annulee"
        | "retiree"
      order_type: "sur_place" | "collect"
      outreach_classification:
        | "interested"
        | "not_interested"
        | "meeting_request"
        | "question"
        | "opt_out"
        | "bounce"
        | "other"
      outreach_email_direction: "outbound" | "inbound"
      outreach_email_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sending"
        | "sent"
        | "received"
        | "failed"
        | "cancelled"
      payment_mode: "especes" | "carte" | "en_ligne" | "mixte"
      payment_provider: "stripe" | "sumup"
      print_job_kind: "order" | "test"
      print_job_status: "pending" | "printed" | "cancelled"
      product: "offre" | "collect"
      shop_discount_type: "percent" | "fixed"
      shop_member_role: "proprietaire" | "equipe"
      shop_message_sender: "customer" | "shop"
      shop_order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      shop_payment_status:
        | "unpaid"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "failed"
      shop_product_badge: "best-seller" | "nouveau" | "coup-de-coeur"
      shop_shipping_kind: "home" | "relay" | "pickup"
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
    Enums: {
      badge: ["maison", "top", "nouveau"],
      clip_post_status: ["en_cours", "publie", "partiel", "echec"],
      crm_activity_type: [
        "note",
        "call",
        "email",
        "visit",
        "whatsapp",
        "appointment",
        "demo",
        "follow_up",
        "status_change",
      ],
      crm_appointment_status: [
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
      ],
      crm_appointment_type: ["visit", "demo", "signing", "follow_up", "other"],
      crm_lead_status: [
        "new",
        "to_contact",
        "contacted",
        "interested",
        "visited",
        "appointment_scheduled",
        "proposal",
        "negotiation",
        "signed",
        "lost",
        "not_interested",
        "no_email",
      ],
      crm_priority: ["low", "medium", "high"],
      crm_restaurant_category: [
        "restaurant",
        "fast_food",
        "cafe",
        "bar",
        "bakery",
        "pizzeria",
        "brasserie",
        "hotel_restaurant",
        "other",
      ],
      crm_task_status: ["open", "done", "cancelled"],
      member_role: ["gerant", "cuisinier", "serveur"],
      offre: ["digital", "smart", "connect"],
      order_status: [
        "en_attente",
        "en_preparation",
        "prete",
        "servie",
        "payee",
        "annulee",
        "retiree",
      ],
      order_type: ["sur_place", "collect"],
      outreach_classification: [
        "interested",
        "not_interested",
        "meeting_request",
        "question",
        "opt_out",
        "bounce",
        "other",
      ],
      outreach_email_direction: ["outbound", "inbound"],
      outreach_email_status: [
        "draft",
        "pending_approval",
        "approved",
        "sending",
        "sent",
        "received",
        "failed",
        "cancelled",
      ],
      payment_mode: ["especes", "carte", "en_ligne", "mixte"],
      payment_provider: ["stripe", "sumup"],
      print_job_kind: ["order", "test"],
      print_job_status: ["pending", "printed", "cancelled"],
      product: ["offre", "collect"],
    },
  },
} as const
