export type Photo = { id: string; url: string | null; position: number; is_primary: boolean; width: number; height: number; status?: 'pending' | 'approved' | 'rejected'; rejection_reason?: string | null };
export type CardPhoto = { id?: string; url: string | null } | null;

export type Card = {
  id: string; display_name: string; age: number; gender: string; relationship_goal: string | null; bio: string | null;
  photo: CardPhoto; photo_count: number; verified: boolean; state: string | null;
  distance: { km: number | null; label: string }; reasons: string[]; match_score: number | null;
};
export type DiscoveryMeta = { sort: string; radius_km: number | null; has_more: boolean; next_cursor: string | null; expand_suggestion: { message?: string; radius?: string | number } | null };

export type Profile = {
  profile: { display_name: string; gender: string; bio: string | null; relationship_goal: string | null; is_discoverable: boolean; state_code: string | null; state: string | null };
  photos: Photo[];
  verification: { selfie_verified: boolean; badge_label: string | null };
  preferences: { min_age: number | null; max_age: number | null; max_distance_km: number | null; interested_in: string[] } | null;
};

export type MatchItem = { id: string; conversation_id: string; matched_at: string; user: { id: string; display_name: string | null; photo: CardPhoto; verified: boolean } };
export type Message = { id: string; client_message_id: string; sender_id: string; mine: boolean; body: string; message_type: string; created_at: string };

export type Wallet = { coin_balance: number; message_cost: number };
export type WalletTx = { id: string; type: string; coins: number; balance: number; created_at: string };

export type Package = { code: string; label: string | null; coins: number; price_minor: number; currency: string; price_display: string | null };
export type PayMethod = { method: 'paystack' | 'manual_transfer'; instructions?: { bank_name: string; account_name: string; account_number: string; instructions?: string } };
export type Order = {
  id: string; method: string; status: 'pending' | 'succeeded' | 'failed' | 'expired' | 'mismatch' | 'rejected'; reference: string;
  amount_minor: number; currency: string; coins: number; product: 'coins' | 'subscription'; plan_name: string | null;
  checkout_url?: string | null; bank_transfer?: { bank_name: string; account_name: string; account_number: string; narration: string; instructions?: string };
  failure_reason: string | null; expires_at: string | null;
};

export type Entitlements = { likes_per_day: number; super_likes_per_day: number; message_discount_percent: number; advanced_filters: boolean };
export type Plan = { code: string; name: string; description: string | null; price_minor: number; price_display: string; period_days: number; resolved: Entitlements };
export type Summary = { plan: { code: string; name: string; ends_at: string } | null; upcoming: { name: string; starts_at: string }[]; entitlements: Entitlements; message_cost: number };

export type Notice = { id: string; type: string; category: string; title: string; body: string; data: Record<string, any>; count: number; read: boolean; created_at: string };
export type NoticePref = { category: string; label: string; mandatory: boolean; push_enabled: boolean };

export type VerificationStatus = {
  enabled: boolean; selfie_verified: boolean; badge_label: string;
  session: { session_id: string; instruction: string; expires_at: string } | null;
  last_attempt: { status: string; failure_reason: string | null } | null; attempts_left_today: number;
};
export type Appealable = { action_id: string; action: string; reason: string; created_at: string; appeal_status: string | null };

export type PublicConfig = Record<string, number | boolean | string | string[] | number[]>;
export type StateItem = { code: string; name: string };

export const GENDERS = [['male', 'Man'], ['female', 'Woman'], ['non_binary', 'Non-binary'], ['other', 'Other']] as const;
export const GOALS = [['marriage', 'Marriage'], ['long_term', 'Long-term'], ['dating', 'Dating'], ['friendship', 'Friendship'], ['not_sure', 'Not sure yet']] as const;
export const goalLabel = (g: string | null) => GOALS.find(([k]) => k === g)?.[1] ?? null;
