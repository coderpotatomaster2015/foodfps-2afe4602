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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_players: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          mode: string
          room_code: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          mode: string
          room_code?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          mode?: string
          room_code?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      ad_exemptions: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_signups: {
        Row: {
          ad_id: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          username: string
        }
        Insert: {
          ad_id?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          username: string
        }
        Update: {
          ad_id?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_signups_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_abuse_events: {
        Row: {
          created_at: string
          created_by: string
          event_type: string
          expires_at: string
          id: string
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_type: string
          expires_at: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_type?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
        }
        Relationships: []
      }
      admin_abuse_schedule: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          event_type: string
          id: string
          is_activated: boolean
          scheduled_date: string
          scheduled_time: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          event_type: string
          id?: string
          is_activated?: boolean
          scheduled_date: string
          scheduled_time: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          event_type?: string
          id?: string
          is_activated?: boolean
          scheduled_date?: string
          scheduled_time?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string
          created_by: string
          description: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          target_url: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_url: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_url?: string
          title?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          messages: Json
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      bans: {
        Row: {
          banned_at: string
          banned_by: string
          expires_at: string
          hours: number
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          expires_at: string
          hours: number
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          expires_at?: string
          hours?: number
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      beta_tasks: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string
          description: string
          feedback: string | null
          id: string
          status: string
          tester_user_id: string
          title: string
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          description: string
          feedback?: string | null
          id?: string
          status?: string
          tester_user_id: string
          title: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          feedback?: string | null
          id?: string
          status?: string
          tester_user_id?: string
          title?: string
        }
        Relationships: []
      }
      beta_testers: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          show_on_first_login: boolean | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          show_on_first_login?: boolean | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          show_on_first_login?: boolean | null
          title?: string | null
        }
        Relationships: []
      }
      chat_permissions: {
        Row: {
          can_use_commands: boolean
          granted_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_use_commands?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_use_commands?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_warnings: {
        Row: {
          created_at: string
          id: string
          is_chat_banned: boolean
          last_warning_at: string | null
          user_id: string
          warning_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_chat_banned?: boolean
          last_warning_at?: string | null
          user_id: string
          warning_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_chat_banned?: boolean
          last_warning_at?: string | null
          user_id?: string
          warning_count?: number
        }
        Relationships: []
      }
      class_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
        }
        Relationships: []
      }
      class_math_problems: {
        Row: {
          answer: string
          class_code_id: string | null
          created_at: string
          created_by: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          class_code_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          class_code_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_math_problems_class_code_id_fkey"
            columns: ["class_code_id"]
            isOneToOne: false
            referencedRelation: "class_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_code_id: string
          id: string
          ip_address: string | null
          is_ip_blocked: boolean | null
          joined_at: string
          session_ends_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          class_code_id: string
          id?: string
          ip_address?: string | null
          is_ip_blocked?: boolean | null
          joined_at?: string
          session_ends_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          class_code_id?: string
          id?: string
          ip_address?: string | null
          is_ip_blocked?: boolean | null
          joined_at?: string
          session_ends_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_code_id_fkey"
            columns: ["class_code_id"]
            isOneToOne: false
            referencedRelation: "class_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_skins: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_data: string
          is_active: boolean
          name: string
          price_coins: number
          price_gems: number
          price_gold: number
          special_power: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          image_data: string
          is_active?: boolean
          name: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
          special_power?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_data?: string
          is_active?: boolean
          name?: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
          special_power?: string | null
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          claimed_at: string
          id: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_type?: string
          reward_value?: string
          user_id?: string
        }
        Relationships: []
      }
      equipped_loadout: {
        Row: {
          equipped_power: string | null
          id: string
          slot_1: string | null
          slot_2: string | null
          slot_3: string | null
          slot_4: string | null
          slot_5: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          equipped_power?: string | null
          id?: string
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          slot_5?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          equipped_power?: string | null
          id?: string
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          slot_5?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          content: string
          created_at: string
          feedback_type: string
          from_user_id: string
          from_username: string
          id: string
          is_processed: boolean
        }
        Insert: {
          content: string
          created_at?: string
          feedback_type?: string
          from_user_id: string
          from_username: string
          id?: string
          is_processed?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          feedback_type?: string
          from_user_id?: string
          from_username?: string
          id?: string
          is_processed?: boolean
        }
        Relationships: []
      }
      food_pass_progress: {
        Row: {
          claimed_tiers: number[]
          current_tier: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_tiers?: number[]
          current_tier?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_tiers?: number[]
          current_tier?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_pass_tiers: {
        Row: {
          created_at: string
          id: string
          power_unlock: string | null
          reward_type: string
          reward_value: number
          score_required: number
          skin_id: string | null
          tier: number
        }
        Insert: {
          created_at?: string
          id?: string
          power_unlock?: string | null
          reward_type: string
          reward_value?: number
          score_required: number
          skin_id?: string | null
          tier: number
        }
        Update: {
          created_at?: string
          id?: string
          power_unlock?: string | null
          reward_type?: string
          reward_value?: number
          score_required?: number
          skin_id?: string | null
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_pass_tiers_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "custom_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          code: string
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          max_players: number
          started_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          max_players?: number
          started_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          max_players?: number
          started_at?: string | null
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          boss_disabled: boolean
          created_at: string
          disabled_message: string | null
          id: string
          leaderboard_public: boolean
          multiplayer_disabled: boolean
          normal_disabled: boolean | null
          normal_disabled_message: string | null
          ranked_disabled: boolean | null
          school_disabled: boolean | null
          school_disabled_message: string | null
          solo_disabled: boolean
          updated_at: string
          website_enabled: boolean
        }
        Insert: {
          boss_disabled?: boolean
          created_at?: string
          disabled_message?: string | null
          id?: string
          leaderboard_public?: boolean
          multiplayer_disabled?: boolean
          normal_disabled?: boolean | null
          normal_disabled_message?: string | null
          ranked_disabled?: boolean | null
          school_disabled?: boolean | null
          school_disabled_message?: string | null
          solo_disabled?: boolean
          updated_at?: string
          website_enabled?: boolean
        }
        Update: {
          boss_disabled?: boolean
          created_at?: string
          disabled_message?: string | null
          id?: string
          leaderboard_public?: boolean
          multiplayer_disabled?: boolean
          normal_disabled?: boolean | null
          normal_disabled_message?: string | null
          ranked_disabled?: boolean | null
          school_disabled?: boolean | null
          school_disabled_message?: string | null
          solo_disabled?: boolean
          updated_at?: string
          website_enabled?: boolean
        }
        Relationships: []
      }
      game_updates: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_beta: boolean
          is_released: boolean
          is_seasonal: boolean
          name: string
          released_at: string | null
          season: string | null
          summary: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_beta?: boolean
          is_released?: boolean
          is_seasonal?: boolean
          name: string
          released_at?: string | null
          season?: string | null
          summary?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_beta?: boolean
          is_released?: boolean
          is_seasonal?: boolean
          name?: string
          released_at?: string | null
          season?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      global_chat: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ip_bans: {
        Row: {
          banned_at: string
          banned_by: string
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          banned_at?: string
          banned_by: string
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      kill_stats: {
        Row: {
          created_at: string
          deaths: number
          id: string
          kills: number
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deaths?: number
          id?: string
          kills?: number
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deaths?: number
          id?: string
          kills?: number
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kill_stats_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          from_user_id: string
          from_username: string
          id: string
          is_appeal: boolean
          is_feedback: boolean
          is_read: boolean
          subject: string
          to_user_id: string
          to_username: string
        }
        Insert: {
          content: string
          created_at?: string
          from_user_id: string
          from_username: string
          id?: string
          is_appeal?: boolean
          is_feedback?: boolean
          is_read?: boolean
          subject: string
          to_user_id: string
          to_username: string
        }
        Update: {
          content?: string
          created_at?: string
          from_user_id?: string
          from_username?: string
          id?: string
          is_appeal?: boolean
          is_feedback?: boolean
          is_read?: boolean
          subject?: string
          to_user_id?: string
          to_username?: string
        }
        Relationships: []
      }
      player_currencies: {
        Row: {
          coins: number
          created_at: string
          gems: number
          gold: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          created_at?: string
          gems?: number
          gold?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          gems?: number
          gold?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_custom_skins: {
        Row: {
          id: string
          purchased_at: string
          skin_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          skin_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          skin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_custom_skins_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "custom_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      player_inventory: {
        Row: {
          id: string
          is_equipped: boolean
          item_id: string
          item_type: string
          purchased_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean
          item_id: string
          item_type: string
          purchased_at?: string
          quantity?: number
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean
          item_id?: string
          item_type?: string
          purchased_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      player_owned_skins: {
        Row: {
          id: string
          purchased_at: string
          skin_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          skin_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          skin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_owned_skins_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "player_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      player_progress: {
        Row: {
          created_at: string
          id: string
          unlocked_weapons: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unlocked_weapons?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unlocked_weapons?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_skins: {
        Row: {
          color: string
          created_at: string
          id: string
          is_seasonal: boolean
          name: string
          price_coins: number
          price_gems: number
          price_gold: number
          season: string | null
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_seasonal?: boolean
          name: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
          season?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_seasonal?: boolean
          name?: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
          season?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          boss_level: number
          created_at: string
          id: string
          ranked_rank: string | null
          ranked_tier: number | null
          total_score: number
          tutorial_completed: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          boss_level?: number
          created_at?: string
          id?: string
          ranked_rank?: string | null
          ranked_tier?: number | null
          total_score?: number
          tutorial_completed?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          boss_level?: number
          created_at?: string
          id?: string
          ranked_rank?: string | null
          ranked_tier?: number | null
          total_score?: number
          tutorial_completed?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ranked_matches: {
        Row: {
          created_at: string
          enemies_killed: number
          id: string
          rank_earned: string | null
          tier_earned: number | null
          user_id: string
          victory: boolean
          waves_completed: number
        }
        Insert: {
          created_at?: string
          enemies_killed?: number
          id?: string
          rank_earned?: string | null
          tier_earned?: number | null
          user_id: string
          victory?: boolean
          waves_completed?: number
        }
        Update: {
          created_at?: string
          enemies_killed?: number
          id?: string
          rank_earned?: string | null
          tier_earned?: number | null
          user_id?: string
          victory?: boolean
          waves_completed?: number
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          reward_type: string
          reward_value: number
          skin_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_type: string
          reward_value?: number
          skin_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_type?: string
          reward_value?: number
          skin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redeem_codes_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "custom_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      redeemed_codes: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeemed_codes_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "redeem_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          health: number | null
          id: string
          is_alive: boolean | null
          joined_at: string
          last_update: string
          position_x: number | null
          position_y: number | null
          room_id: string
          score: number | null
          user_id: string | null
          username: string
          weapon: string | null
        }
        Insert: {
          health?: number | null
          id?: string
          is_alive?: boolean | null
          joined_at?: string
          last_update?: string
          position_x?: number | null
          position_y?: number | null
          room_id: string
          score?: number | null
          user_id?: string | null
          username: string
          weapon?: string | null
        }
        Update: {
          health?: number | null
          id?: string
          is_alive?: boolean | null
          joined_at?: string
          last_update?: string
          position_x?: number | null
          position_y?: number | null
          room_id?: string
          score?: number | null
          user_id?: string | null
          username?: string
          weapon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_id: string
          item_type: string
          name: string
          price_coins: number
          price_gems: number
          price_gold: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          item_type: string
          name: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          item_type?: string
          name?: string
          price_coins?: number
          price_gems?: number
          price_gold?: number
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_approved: boolean
          is_pending: boolean
          user_id: string
          username: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_pending?: boolean
          user_id: string
          username: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_pending?: boolean
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_player_currency: {
        Args: {
          _coins?: number
          _gems?: number
          _gold?: number
          _user_id: string
        }
        Returns: boolean
      }
      get_ban_info: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          hours_remaining: number
          reason: string
        }[]
      }
      get_class_info: {
        Args: { _user_id: string }
        Returns: {
          class_name: string
          school_mode_only: boolean
          session_ends_at: string
        }[]
      }
      gift_currency: {
        Args: {
          _coins?: number
          _gems?: number
          _gold?: number
          _target_username: string
        }
        Returns: boolean
      }
      grant_owner_with_password: {
        Args: { _password: string; _user_id: string }
        Returns: boolean
      }
      has_ad_exemption: { Args: { _user_id: string }; Returns: boolean }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_class_member: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher" | "owner"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "teacher", "owner"],
    },
  },
} as const
