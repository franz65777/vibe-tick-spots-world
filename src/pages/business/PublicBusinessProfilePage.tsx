import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, Phone, Globe, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileTabs from '@/components/profile/ProfileTabs';
import PostsGrid from '@/components/profile/PostsGrid';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { useTranslation } from 'react-i18next';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_description?: string;
  phone_number?: string;
  website_url?: string;
  verification_status?: string;
  location_id?: string;
}

interface BusinessLocation {
  id: string;
  name: string;
  category: string;
  city?: string;
  address?: string;
  image_url?: string;
  google_place_id?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

const PublicBusinessProfilePage = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    posts: 0,
    likes: 0,
    saves: 0
  });
  const [averageRating, setAverageRating] = useState<number | null>(null);

  const { detailedAddress } = useDetailedAddress({
    id: location?.id,
    city: location?.city,
    address: location?.address,
    coordinates: location?.latitude && location?.longitude ? {
      lat: Number(location.latitude),
      lng: Number(location.longitude)
    } : undefined
  });

  useEffect(() => {
    if (userId) {
      fetchBusinessProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (location?.id) {
      fetchBusinessStats();
      fetchAverageRating();
    }
  }, [location?.id]);

  const fetchBusinessProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get the business profile
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (businessError) throw businessError;
      
      if (businessData) {
        setBusinessProfile(businessData);
        
        // Fetch the associated location
        if (businessData.location_id) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('*')
            .eq('id', businessData.location_id)
            .maybeSingle();
            
          if (locationData) {
            setLocation(locationData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessStats = async () => {
    if (!location?.id) return;
    
    try {
      // Count posts at this location
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);

      // Count likes on this location
      const { count: likesCount } = await supabase
        .from('location_likes')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);

      // Count saves
      const { count: savesCount } = await supabase
        .from('saved_places')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', location.id);

      setStats({
        posts: postsCount || 0,
        likes: likesCount || 0,
        saves: savesCount || 0
      });
    } catch (error) {
      console.error('Error fetching business stats:', error);
    }
  };

  const fetchAverageRating = async () => {
    if (!location?.id) return;
    
    try {
      const { count } = await supabase
        .from('location_likes')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);

      if (count && count > 0) {
        const rating = Math.min(5, Math.max(1, Math.round(count / 10 + 3)));
        setAverageRating(rating);
      }
    } catch (error) {
      console.error('Error calculating average rating:', error);
    }
  };

  const handleMessage = () => {
    if (userId) {
      navigate(`/messages?recipient=${userId}`);
    }
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!businessProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">{t('profileNotFound', { ns: 'common' })}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            {t('goBack', { ns: 'common' })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">
            {businessProfile.business_name}
          </h1>
        </div>

        {/* Cover Image with gradient fade */}
        <div className="relative mx-4 rounded-2xl overflow-hidden h-40">
          {location?.image_url ? (
            <img
              src={location.image_url}
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              {location && React.createElement(getCategoryIcon(location.category), {
                className: 'w-16 h-16 text-muted-foreground/40',
                strokeWidth: 1.5
              })}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          
          {/* Average Rating - Top Right */}
          {averageRating && (
            <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-foreground">{averageRating}</span>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground truncate">
              {location?.name || businessProfile.business_name}
            </h2>
            {location && (
              <Badge className={`${getCategoryColor(location.category)} bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full border-0 font-medium shadow-sm`}>
                {formatCategory(location.category)}
              </Badge>
            )}
          </div>
        </div>

        {/* Location Label */}
        {location && (
          <div className="px-4 pt-3 flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">
              {detailedAddress || (location.address && location.city 
                ? `${location.city}, ${location.address}` 
                : location.city) || 'Location'}
            </span>
          </div>
        )}

        {/* Business Description */}
        {businessProfile.business_description && (
          <div className="px-4 pt-3">
            <p className="text-sm text-muted-foreground">
              {businessProfile.business_description}
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-around px-4 py-4 border-b border-border/50">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{stats.posts}</p>
            <p className="text-xs text-muted-foreground">{t('posts', { ns: 'common' })}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{stats.likes}</p>
            <p className="text-xs text-muted-foreground">{t('likes', { ns: 'common' })}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{stats.saves}</p>
            <p className="text-xs text-muted-foreground">{t('saves', { ns: 'common' })}</p>
          </div>
        </div>

        {/* Contact buttons */}
        <div className="flex gap-3 px-4 py-3">
          {user?.id !== userId && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleMessage}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {t('message', { ns: 'common' })}
            </Button>
          )}
          {businessProfile.phone_number && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.open(`tel:${businessProfile.phone_number}`, '_self')}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
          {businessProfile.website_url && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.open(businessProfile.website_url, '_blank')}
            >
              <Globe className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="pt-2">
          <ProfileTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            showTrips={false} 
            showLocations={false} 
            showMarketing={false}
          />
        </div>

        {/* Tab Content */}
        <div className="px-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
          {activeTab === 'posts' && location?.id && (
            <div className="pb-4">
              <PostsGrid 
                userId={userId} 
                locationId={location.id}
                contentTypes={['event', 'discount', 'promotion', 'announcement']}
              />
            </div>
          )}

          {activeTab === 'tagged' && location?.id && (
            <div className="pb-4">
              <PostsGrid locationId={location.id} excludeUserId={userId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBusinessProfilePage;
