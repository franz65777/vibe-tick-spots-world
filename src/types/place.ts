
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
  popularity?: number;
  distance?: string | number;
  totalSaves?: number;
}
