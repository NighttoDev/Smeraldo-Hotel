// Supabase CLI generated types — DO NOT EDIT manually
// Regenerate via: npx supabase gen types typescript --db-url "..." > src/lib/db/types.ts

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
      attendance_logs: {
        Row: {
          id: string
          staff_id: string
          log_date: string
          shift_value: number
          logged_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          log_date: string
          shift_value: number
          logged_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          staff_id?: string
          log_date?: string
          shift_value?: number
          logged_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          room_id: string
          guest_id: string
          check_in_date: string
          check_out_date: string
          nights_count: number
          booking_source: Database["public"]["Enums"]["booking_source"] | null
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          guest_id: string
          check_in_date: string
          check_out_date: string
          nights_count?: never
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          guest_id?: string
          check_in_date?: string
          check_out_date?: string
          nights_count?: never
          booking_source?: Database["public"]["Enums"]["booking_source"] | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          category: string
          current_stock: number
          low_stock_threshold: number
          unit: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          current_stock?: number
          low_stock_threshold?: number
          unit?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          current_stock?: number
          low_stock_threshold?: number
          unit?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      room_status_logs: {
        Row: {
          id: string
          room_id: string
          previous_status: Database["public"]["Enums"]["room_status"] | null
          new_status: Database["public"]["Enums"]["room_status"]
          changed_by: string | null
          changed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          room_id: string
          previous_status?: Database["public"]["Enums"]["room_status"] | null
          new_status: Database["public"]["Enums"]["room_status"]
          changed_by?: string | null
          changed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          previous_status?: Database["public"]["Enums"]["room_status"] | null
          new_status?: Database["public"]["Enums"]["room_status"]
          changed_by?: string | null
          changed_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_status_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          id: string
          room_number: string
          floor: number
          room_type: string
          status: Database["public"]["Enums"]["room_status"] | null
          current_guest_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          room_number: string
          floor: number
          room_type: string
          status?: Database["public"]["Enums"]["room_status"] | null
          current_guest_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          room_number?: string
          floor?: number
          room_type?: string
          status?: Database["public"]["Enums"]["room_status"] | null
          current_guest_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          id: string
          full_name: string
          role: Database["public"]["Enums"]["staff_role"]
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          role: Database["public"]["Enums"]["staff_role"]
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          quantity: number
          recipient_name: string | null
          logged_by: string
          movement_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          quantity: number
          recipient_name?: string | null
          logged_by: string
          movement_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          quantity?: number
          recipient_name?: string | null
          logged_by?: string
          movement_date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      booking_source: "agoda" | "booking_com" | "trip_com" | "facebook" | "walk_in"
      movement_type: "stock_in" | "stock_out"
      room_status:
        | "available"
        | "occupied"
        | "checking_out_today"
        | "being_cleaned"
        | "ready"
      staff_role: "manager" | "reception" | "housekeeping"
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
