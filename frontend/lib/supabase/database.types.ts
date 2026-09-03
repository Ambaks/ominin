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
      etablissements: {
        Row: {
          address: string
          collect_slot_capacity: number
          cover_image: string | null
          created_at: string
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
          etablissement_id: string
          hostname: string | null
          id: string
          last_seen_at: string | null
          name: string
          version: string | null
        }
        Insert: {
          created_at?: string
          etablissement_id: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name: string
          version?: string | null
        }
        Update: {
          created_at?: string
          etablissement_id?: string
          hostname?: string | null
          id?: string
          last_seen_at?: string | null
          name?: string
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
      order_items: {
        Row: {
          id: string
          item_id: string | null
          name: string
          options: Json
          order_id: string
          quantity: number
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          name: string
          options?: Json
          order_id: string
          quantity: number
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          id?: string
          item_id?: string | null
          name?: string
          options?: Json
          order_id?: string
          quantity?: number
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
          group_id: string | null
          id: string
          paid_online: boolean
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at: string | null
          server_id: string | null
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
          group_id?: string | null
          id?: string
          paid_online?: boolean
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at?: string | null
          server_id?: string | null
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
          group_id?: string | null
          id?: string
          paid_online?: boolean
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          pickup_at?: string | null
          server_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          sumup_checkout_id?: string | null
          table_id?: string | null
          tip_amount?: number | null
          type?: Database["public"]["Enums"]["order_type"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_group_id_etablissement_id_fkey"
            columns: ["group_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id", "etablissement_id"]
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
          server_id: string | null
        }
        Insert: {
          etablissement_id: string
          group_id?: string | null
          id?: string
          number: number
          server_id?: string | null
        }
        Update: {
          etablissement_id?: string
          group_id?: string | null
          id?: string
          number?: number
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_group_id_etablissement_id_fkey"
            columns: ["group_id", "etablissement_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id", "etablissement_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
      create_table_group: {
        Args: { p_integrate_orders: boolean; p_table_ids: string[] }
        Returns: {
          created_at: string
          etablissement_id: string
          id: string
        }
        SetofOptions: {
          from: "*"
          to: "table_groups"
          isOneToOne: true
          isSetofReturn: false
        }
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
      is_admin: { Args: never; Returns: boolean }
      member_etablissements: { Args: never; Returns: string[] }
      omilink_provision_device: {
        Args: { p_etablissement_id: string; p_name: string }
        Returns: string
      }
      place_order: {
        Args: { p_items: Json; p_slug: string; p_table_number: number }
        Returns: string
      }
      reorder_categories: { Args: { p_ids: string[] }; Returns: undefined }
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
      payment_mode: "especes" | "carte" | "en_ligne"
      payment_provider: "stripe" | "sumup"
      print_job_kind: "order" | "test"
      print_job_status: "pending" | "printed" | "cancelled"
      product: "offre" | "collect"
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
      payment_mode: ["especes", "carte", "en_ligne"],
      payment_provider: ["stripe", "sumup"],
      print_job_kind: ["order", "test"],
      print_job_status: ["pending", "printed", "cancelled"],
      product: ["offre", "collect"],
    },
  },
} as const
