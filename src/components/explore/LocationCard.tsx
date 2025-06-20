
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Users } from 'lucide-react';
import { Place } from '@/types/place';
import { toast } from '@/hooks/use-toast';

interface LocationCardProps {
  place: Place;
  isLiked: boolean;
  isSaved: boolean;
  onLike: (placeId: string) => void;
  onSave: (place: Place) => void;
  onComment: (place: Place) => void;
  onShare: (place: Place) => void;
  onCardClick: (place: Place) => void;
}

const LocationCard = ({
  place,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onComment,
  onShare,
  onCardClick
}: LocationCardProps) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      onLike(place.id);
      toast({
        title: isLiked ? "Removed from likes" : "Added to likes",
        description: isLiked ? "Location removed from your likes" : "Location added to your likes",
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setTimeout(() => setIsLiking(false), 500);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      onSave(place);
      toast({
        title: isSaved ? "Removed from saved" : "Saved location",
        description: isSaved ? "Location removed from your saved list" : "Location saved to your list",
      });
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComment(place);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(place);
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getDistanceText = () => {
    if (typeof place.distance === 'string') return place.distance;
    if (typeof place.distance === 'number') return `${place.distance.toFixed(1)}km`;
    return '';
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group bg-white mx-4 mb-3 rounded-2xl border-0 shadow-sm"
      onClick={() => onCardClick(place)}
    >
      <div className="relative">
        {place.image && (
          <div className="aspect-[4/3] overflow-hidden rounded-t-2xl">
            <img
              src={place.image}
              alt={place.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        {place.isNew && (
          <Badge className="absolute top-3 left-3 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-full">
            New
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={isSaving}
          className={`absolute top-3 right-3 h-8 w-8 rounded-full backdrop-blur-md transition-all ${
            isSaved 
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
              : 'bg-white/90 text-gray-700 hover:bg-white shadow-md'
          } ${isSaving ? 'animate-pulse' : ''}`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-gray-900 leading-tight line-clamp-1 text-lg">
                  {place.name}
                </h3>
                {getDistanceText() && (
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>{getDistanceText()} away</span>
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0 bg-gray-100 text-gray-700 border-0 text-xs px-2 py-1 rounded-lg">
                {formatCategory(place.category)}
              </Badge>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="font-medium">{place.likes}</span>
              </div>
              {place.visitors && place.visitors.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{place.visitors.length}</span>
                </div>
              )}
              {place.totalSaves && (
                <div className="flex items-center gap-1">
                  <Bookmark className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{place.totalSaves}</span>
                </div>
              )}
            </div>
          </div>

          {/* Friends who saved */}
          {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex -space-x-2">
                {place.friendsWhoSaved.slice(0, 3).map((friend, index) => (
                  <Avatar key={index} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={`https://images.unsplash.com/${friend.avatar}?w=24&h=24&fit=crop&crop=face`} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                      {friend.name[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-gray-600">
                Saved by <span className="font-medium text-gray-800">{place.friendsWhoSaved[0].name}</span>
                {place.friendsWhoSaved.length > 1 && ` and ${place.friendsWhoSaved.length - 1} others`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`h-9 px-3 rounded-xl transition-all ${
                  isLiked 
                    ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                } ${isLiking ? 'animate-pulse' : ''}`}
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">Like</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="font-medium">Comment</span>
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              <Share2 className="w-4 h-4 mr-1" />
              <span className="font-medium">Share</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationCard;
