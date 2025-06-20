
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
      setTimeout(() => setIsLiking(false), 500); // Prevent double clicks
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
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={() => onCardClick(place)}
    >
      <div className="relative">
        {place.image && (
          <div className="aspect-video overflow-hidden">
            <img
              src={place.image}
              alt={place.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}
        
        {place.isNew && (
          <Badge className="absolute top-3 left-3 bg-green-500 hover:bg-green-600">
            New
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={isSaving}
          className={`absolute top-3 right-3 h-8 w-8 rounded-full backdrop-blur-sm ${
            isSaved 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white/80 text-gray-700 hover:bg-white'
          } ${isSaving ? 'animate-pulse' : ''}`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 leading-tight line-clamp-1">
                {place.name}
              </h3>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {formatCategory(place.category)}
              </Badge>
            </div>
            
            {getDistanceText() && (
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                {getDistanceText()} away
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{place.likes}</span>
            </div>
            {place.visitors && place.visitors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{place.visitors.length}</span>
              </div>
            )}
            {place.totalSaves && (
              <div className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                <span>{place.totalSaves}</span>
              </div>
            )}
          </div>

          {/* Friends who saved */}
          {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {place.friendsWhoSaved.slice(0, 3).map((friend, index) => (
                  <Avatar key={index} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={`https://images.unsplash.com/${friend.avatar}?w=24&h=24&fit=crop&crop=face`} />
                    <AvatarFallback className="text-xs">{friend.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                Saved by {place.friendsWhoSaved[0].name}
                {place.friendsWhoSaved.length > 1 && ` and ${place.friendsWhoSaved.length - 1} others`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`h-9 px-3 ${
                  isLiked ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-900'
                } ${isLiking ? 'animate-pulse' : ''}`}
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                Like
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="h-9 px-3 text-gray-600 hover:text-gray-900"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Comment
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-9 px-3 text-gray-600 hover:text-gray-900"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationCard;
