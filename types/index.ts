export type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  verified: boolean;
  is_looking_now: boolean;
  last_active?: string;
};

export type PickupSession = {
  id: string;
  creator_id: string;
  sport: string;
  title: string;
  description?: string;
  scheduled_at: string;
  max_players: number;
  current_players: number;
  status: 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
};