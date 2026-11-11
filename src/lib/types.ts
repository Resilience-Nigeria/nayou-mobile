export type Photo = { id: string; url: string | null; position: number; is_primary: boolean; width: number; height: number; status?: 'pending' | 'approved' | 'rejected'; rejection_reason?: string | null };
export type CardPhoto = { id?: string; url: string | null } | null;

export type Card = {
  id: string; display_name: string; age: number; gender: string; relationship_goal: string | null; bio: string | null;
  photo: CardPhoto; photo_count: number; verified: boolean; online?: boolean; state: string | null;
  distance: { km: number | null; label: string }; reasons: string[]; match_score: number | null;
};
export type DiscoveryMeta = { sort: string; radius_km: number | null; has_more: boolean; next_cursor: string | null; expand_suggestion: { message?: string; radius?: string | number } | null };

export type Profile = {
  profile: { display_name: string; gender: string; bio: string | null; relationship_goal: string | null; is_discoverable: boolean; state_code: string | null; state: string | null; height_cm: number | null; personality_traits: string[]; show_online: boolean; show_current_location?: boolean };
  photos: Photo[];
  verification: { selfie_verified: boolean; badge_label: string | null };
  preferences: { min_age: number | null; max_age: number | null; max_distance_km: number | null; interested_in: string[] } | null;
};

export type MatchItem = { id: string; conversation_id: string; matched_at: string; user: { id: string; display_name: string | null; photo: CardPhoto; verified: boolean } };
type Person = { id: string; display_name: string | null; photo: CardPhoto; verified: boolean; online?: boolean };
export type ConversationItem = { id: string; matched: boolean; closed: boolean; user: Person; last_message: { body: string; mine: boolean; created_at: string } | null; activity_at: string; unread: number };
export type ConversationInfo = { free_messages?: boolean; id: string; match_id: string | null; matched: boolean; closed: boolean; user: Person };
export type PersonProfile = {
  id: string; is_me: boolean; display_name: string | null; age: number | null; gender: string | null; bio: string | null;
  relationship_goal: string | null; height_cm: number | null; personality_traits: string[]; state: string | null; distance_label: string | null;
  online: boolean; last_active_at: string | null; verified: boolean;
  current_location: { city: string | null; region: string | null; country: string | null } | null;
  photos: { id: string; url: string | null; width: number; height: number }[];
  stats: { likes: number; followers: number; following: number; messages_with_you: number };
  you: { swipe: 'like' | 'pass' | 'super_like' | null; following: boolean; follows_you: boolean; mutual: boolean; liked: boolean };
};
export type MediaCard = { id: string; kind: 'image' | 'video'; mime: string; url: string | null; width: number | null; height: number | null };
export type Post = { id: string; body: string; media: MediaCard | null; created_at: string; mine: boolean; author: { id: string; display_name: string | null; photo: CardPhoto } };
export type ChatStatus = { typing: boolean; other_read_at: string | null };
export type LikeItem = { id: string; action: 'like' | 'super_like'; liked_at: string; matched: boolean; conversation_id: string | null; user: Person };
export type Message = { id: string; client_message_id: string; sender_id: string; mine: boolean; body: string; message_type: string; media: MediaCard | null; created_at: string };
export type HomePerson = { id: string; display_name: string; age: number; gender: string; relationship_goal: string | null; bio: string | null; state: string | null; photo: CardPhoto; photo_count: number; verified: boolean; online: boolean; following: boolean };

export type Wallet = { coin_balance: number; message_cost: number };
export type GiftRules = {
  enabled: boolean; balance: number; min_amount: number; max_amount: number; min_balance_after_gift: number; min_balance_to_gift: number;
  max_giftable: number; remaining_today: number | null; fee_percent: number; presets: number[];
};
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

export const GENDERS = [['male', 'Male'], ['female', 'Female']] as const;
export const GOALS = [['marriage', 'Marriage'], ['long_term', 'Long-term'], ['dating', 'Dating'], ['friendship', 'Friendship'], ['fun', 'Fun'], ['not_sure', 'Not sure yet']] as const;
export const goalLabel = (g: string | null) => GOALS.find(([k]) => k === g)?.[1] ?? null;

export const genderLabel = (g: string | null) => GENDERS.find(([k]) => k === g)?.[1] ?? null;
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export function heightLabel(cm: number | null): string | null {
  if (!cm) return null;
  const inches = Math.round(cm / 2.54);
  return `${cm} cm (${Math.floor(inches / 12)}'${inches % 12}")`;
}

export type CallInfo = {
  id: string; conversation_id: string; type: 'audio' | 'video'; status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled' | 'failed';
  end_reason: string | null; direction: 'incoming' | 'outgoing'; price_per_second: number; price_per_minute: number; coins_charged: number; duration_seconds: number;
  created_at: string; answered_at: string | null;
  user: { id: string; display_name: string | null; photo: CardPhoto; verified: boolean; online?: boolean };
  livekit?: { url: string; token: string };
};
