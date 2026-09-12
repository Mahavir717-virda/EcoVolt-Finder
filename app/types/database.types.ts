/**
 * Database types for Supabase
 * These types match the schema defined in the PRD
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Charger status enum
export type ChargerStatus = 'available' | 'in_use' | 'reserved' | 'offline';

// Reservation status enum
export type ReservationStatus = 'active' | 'completed' | 'cancelled' | 'expired';

// User plan type enum
export type PlanType = 'free' | 'premium';

// Charger type enum - matches chargerTypes.ts
export type ChargerType = 'level_1' | 'level_2' | 'dc_fast' | 'tesla_supercharger';

// Connector type enum - matches chargerTypes.ts
export type ConnectorType = 'j1772' | 'type2' | 'ccs' | 'chademo' | 'tesla' | 'nacs';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          plan_type: PlanType;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          plan_type?: PlanType;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          plan_type?: PlanType;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stations: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          address: string;
          city: string;
          total_chargers: number;
          available_chargers: number;
          rating: number | null;
          amenities: string[] | null;
          image_url: string | null;
          is_active: boolean;
          greenness_score?: number;
          co2_saved_kg?: number;
          price_from?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          latitude: number;
          longitude: number;
          address: string;
          city: string;
          total_chargers?: number;
          available_chargers?: number;
          rating?: number | null;
          amenities?: string[] | null;
          image_url?: string | null;
          is_active?: boolean;
          price_from?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          city?: string;
          total_chargers?: number;
          available_chargers?: number;
          rating?: number | null;
          amenities?: string[] | null;
          image_url?: string | null;
          is_active?: boolean;
          price_from?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      chargers: {
        Row: {
          id: string;
          station_id: string;
          charger_type: ChargerType;
          connector_type: ConnectorType;
          power_kw: number;
          price_per_kwh: number;
          status: ChargerStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          station_id: string;
          charger_type: ChargerType;
          connector_type: ConnectorType;
          power_kw: number;
          price_per_kwh: number;
          status?: ChargerStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          station_id?: string;
          charger_type?: ChargerType;
          connector_type?: ConnectorType;
          power_kw?: number;
          price_per_kwh?: number;
          status?: ChargerStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          charger_id: string;
          start_time: string;
          end_time: string;
          status: ReservationStatus;
          total_price?: number;
          total_cost?: number;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          charger_id: string;
          start_time: string;
          end_time: string;
          status?: ReservationStatus;
          total_price?: number;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          charger_id?: string;
          start_time?: string;
          end_time?: string;
          status?: ReservationStatus;
          total_price?: number;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          max_active_reservations: number;
          monthly_price: number;
        };
        Insert: {
          id?: string;
          name: string;
          max_active_reservations: number;
          monthly_price: number;
        };
        Update: {
          id?: string;
          name?: string;
          max_active_reservations?: number;
          monthly_price?: number;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          station_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          station_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          station_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      charger_status: ChargerStatus;
      reservation_status: ReservationStatus;
      plan_type: PlanType;
      charger_type: ChargerType;
      connector_type: ConnectorType;
    };
  };
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Station = Database['public']['Tables']['stations']['Row'];
export type Charger = Database['public']['Tables']['chargers']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Favorite = Database['public']['Tables']['favorites']['Row'];

// Extended types with relationships
export type StationWithChargers = Station & {
  chargers: Charger[];
};

export type ChargerWithStation = Charger & {
  station: Station;
};

export type ReservationWithDetails = Reservation & {
  charger: ChargerWithStation;
};

export type FavoriteWithStation = Favorite & {
  station: Station;
};
