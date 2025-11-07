import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import cameraIcon3d from '@/assets/icon-camera-3d.png';
import starIcon3d from '@/assets/icon-star-3d.png';
import pinLocationIcon3d from '@/assets/icon-pin-location-3d.png';

interface ProfileMessageCardProps {
  profileData: {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
  };
  currentChatUserId?: string;
}

const ProfileMessageCard = ({ profileData, currentChatUserId }: ProfileMessageCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [photosCount, setPhotosCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const userId = profileData.id;

        // Run all queries in parallel
        const [postsRes, reviewsRes, savedPlacesRes, userSavedRes] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('post_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('saved_places').select('place_id').eq('user_id', userId),
          supabase.from('user_saved_locations').select('location_id').eq('user_id', userId),
        ]);

        setPhotosCount(postsRes.count ?? 0);
        setReviewsCount(reviewsRes.count ?? 0);

        const sp = (savedPlacesRes.data || []) as { place_id: string }[];
        const us = (userSavedRes.data || []) as { location_id: string }[];
        const unique = new Set<string>();
        sp.forEach(p => p.place_id && unique.add(String(p.place_id)));
        us.forEach(p => p.location_id && unique.add(String(p.location_id)));
        setSavedCount(unique.size);
      } catch (e) {
        console.error('Failed to load profile stats in ProfileMessageCard:', e);
      }
    };

    if (profileData?.id) loadStats();
  }, [profileData?.id]);

  const handleViewProfile = () => {
    navigate(`/profile/${profileData.id}`, {
      state: {
        returnTo: 'chat',
        chatUserId: currentChatUserId
      }
    });
  };

  // Remove @ from username if present
  const displayUsername = profileData.username?.startsWith('@')
    ? profileData.username.slice(1)
    : profileData.username;

  return (
    <div
      className="p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleViewProfile}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profileData.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profileData.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-foreground text-base">{displayUsername}</p>
          {profileData.bio && (
            <p className="text-xs text-muted-foreground truncate">{profileData.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <img src={cameraIcon3d} alt="Foto caricate" className="w-5 h-5 object-contain" loading="lazy" />
          <span className="font-bold text-foreground">{photosCount ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={pinLocationIcon3d} alt="Luoghi salvati" className="w-5 h-5 object-contain" loading="lazy" />
          <span className="font-bold text-foreground">{savedCount ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={starIcon3d} alt="Recensioni lasciate" className="w-5 h-5 object-contain" loading="lazy" />
          <span className="font-bold text-foreground">{reviewsCount ?? '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileMessageCard;
