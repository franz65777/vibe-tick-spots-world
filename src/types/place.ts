
export interface Place {
  id: string;
  name: string;
  category: string;
  city?: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: {
    name: string;
    avatar: string;
    isFollowing: boolean;
  } | string;
  addedDate?: string;
  isFollowing?: boolean;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  popularity?: number;
  distance?: string | number;
  totalSaves?: number;
  address?: string;
  description?: string;
  postCount?: number;
  createdBy?: string;
  createdAt?: string;
  google_place_id?: string;
  friendsSaved?: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  sourcePostId?: string;
  sharedByUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}
