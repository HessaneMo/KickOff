export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string | null; avatar_url: string | null; created_at: string; plan: "free" | "pro" | "club"; stripe_customer_id: string | null };
        Insert: { id: string; username?: string | null; avatar_url?: string | null; plan?: "free" | "pro" | "club"; stripe_customer_id?: string | null };
        Update: { username?: string | null; avatar_url?: string | null; plan?: "free" | "pro" | "club"; stripe_customer_id?: string | null };
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string; name: string; organizer_id: string;
          format: "groups" | "knockout" | "groups_knockout";
          team_size: number; visibility: "public" | "private";
          status: "draft" | "open" | "ongoing" | "finished";
          short_code: string; max_teams: number;
          starts_at: string | null; created_at: string;
        };
        Insert: {
          name: string; organizer_id: string;
          format: "groups" | "knockout" | "groups_knockout";
          team_size: number; visibility?: "public" | "private";
          status?: "draft" | "open" | "ongoing" | "finished";
          short_code: string; max_teams?: number; starts_at?: string | null;
        };
        Update: {
          name?: string; format?: "groups" | "knockout" | "groups_knockout";
          team_size?: number; visibility?: "public" | "private";
          status?: "draft" | "open" | "ongoing" | "finished";
          max_teams?: number; starts_at?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: { id: string; tournament_id: string; name: string; created_at: string };
        Insert: { tournament_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      tournament_members: {
        Row: {
          id: string; tournament_id: string; user_id: string;
          role: "organizer" | "co_organizer" | "encoder" | "player";
          team_id: string | null; status: "starter" | "sub";
          position: string | null; created_at: string;
        };
        Insert: {
          tournament_id: string; user_id: string;
          role: "organizer" | "co_organizer" | "encoder" | "player";
          team_id?: string | null; status?: "starter" | "sub"; position?: string | null;
        };
        Update: { role?: string; team_id?: string | null; status?: "starter" | "sub"; position?: string | null };
        Relationships: [];
      };
      groups: {
        Row: { id: string; tournament_id: string; name: string };
        Insert: { tournament_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      group_teams: {
        Row: { group_id: string; team_id: string };
        Insert: { group_id: string; team_id: string };
        Update: { group_id?: string; team_id?: string };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string; tournament_id: string; group_id: string | null;
          home_team_id: string; away_team_id: string;
          home_score: number | null; away_score: number | null;
          scheduled_at: string | null; played_at: string | null;
          status: "scheduled" | "ongoing" | "finished";
          encoded_by: string | null;
        };
        Insert: {
          tournament_id: string; group_id?: string | null;
          home_team_id: string; away_team_id: string;
          home_score?: number | null; away_score?: number | null;
          scheduled_at?: string | null; status?: "scheduled" | "ongoing" | "finished";
        };
        Update: { home_score?: number | null; away_score?: number | null; status?: string; played_at?: string | null; encoded_by?: string | null };
        Relationships: [];
      };
      goals: {
        Row: { id: string; match_id: string; player_id: string | null; team_id: string; is_assist: boolean; minute: number | null };
        Insert: { match_id: string; player_id?: string | null; team_id: string; is_assist?: boolean; minute?: number | null };
        Update: { player_id?: string | null; is_assist?: boolean; minute?: number | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TournamentMember = Database["public"]["Tables"]["tournament_members"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
