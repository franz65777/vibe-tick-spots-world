
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Users, Star } from 'lucide-react';
import { Place } from '@/types/place';
import { usePlaceEngagement } from '@/hooks/usePlaceEngagement';
import { formatDistanceToNow } from 'date-fns';
import CommentModal from './CommentModal';
import ShareModal from './ShareModal';

interface LocationCardProps {
  place: Place;
  onCardClick: (place: Place) => void;
}

const LocationCard = ({ place, onCardClick }: LocationCardProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = usePlaceEngagement();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await toggleLike(place.id);
    } finally {
      setTimeout(() => setIsLiking(false), 500);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await toggleSave(place);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentModalOpen(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModalOpen(true);
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getDistanceText = () => {
    if (typeof place.distance === 'string') return place.distance;
    if (typeof place.distance === 'number') return `${place.distance.toFixed(1)}km`;
    return '';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getAddedByName = () => {
    if (typeof place.addedBy === 'string') return place.addedBy;
    if (typeof place.addedBy === 'object' && place.addedBy?.name) return place.addedBy.name;
    return 'Anonymous';
  };

  const isBusinessLocation = () => {
    return typeof place.addedBy === 'object' && place.addedBy?.isFollowing === false;
  };

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white mx-4 mb-4 rounded-2xl border-0 shadow-sm"
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
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {place.isNew && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-full border-0">
                New
              </Badge>
            )}
            {isBusinessLocation() && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 rounded-full border-0">
                Business
              </Badge>
            )}
            {place.popularity && place.popularity > 80 && (
              <Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 rounded-full border-0 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Popular
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={isSaving}
            className={`absolute top-3 right-3 h-8 w-8 rounded-full backdrop-blur-md transition-all ${
              isSaved(place.id)
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                : 'bg-white/90 text-gray-700 hover:bg-white shadow-md'
            } ${isSaving ? 'animate-pulse' : ''}`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved(place.id) ? 'fill-current' : ''}`} />
          </Button>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with name and category */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 leading-tight text-lg truncate">
                  {place.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{place.city || 'Unknown City'}</span>
                  </div>
                  {getDistanceText() && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{getDistanceText()}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-gray-100 text-gray-700 border-0 text-xs px-2 py-1 rounded-lg">
                {formatCategory(place.category)}
              </Badge>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-red-500">
                  <Heart className="w-4 h-4" />
                  <span className="font-medium">{place.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-500">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-medium">{place.totalSaves || 0}</span>
                </div>
                {place.visitors && place.visitors.length > 0 && (
                  <div className="flex items-center gap-1 text-green-500">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{place.visitors.length}</span>
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
                    isLiked(place.id)
                      ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  } ${isLiking ? 'animate-pulse' : ''}`}
                >
                  <Heart className={`w-4 h-4 mr-1 ${isLiked(place.id) ? 'fill-current' : ''}`} />
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

            {/* Added by section */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Discovered by <span className="font-medium text-gray-700">{getAddedByName()}</span>
                </span>
                {place.addedDate && (
                  <span>{formatDate(place.addedDate)}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        place={place}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        place={place}
      />
    </>
  );
};

export default LocationCard;
