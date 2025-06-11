
import React from 'react';
import { Heart, MapPin, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[] | number;
  visitors: string[] | number;
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: {
    name: string;
    avatar: string;
    isFollowing: boolean;
  };
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  distance?: string;
  totalSaves?: number;
}

interface PlaceCardProps {
  place: Place;
  isLiked: boolean;
  onCardClick: () => void;
  onLikeToggle: () => void;
  onShare: () => void;
  onComment: () => void;
  cityName: string;
}

const PlaceCard = ({ 
  place, 
  isLiked, 
  onCardClick, 
  onLikeToggle, 
  onShare, 
  onComment,
  cityName 
}: PlaceCardProps) => {
  const friendsWhoSavedCount = typeof place.friendsWhoSaved === 'number' 
    ? place.friendsWhoSaved 
    : place.friendsWhoSaved?.length || 0;
  
  const visitorsCount = typeof place.visitors === 'number' 
    ? place.visitors 
    : place.visitors?.length || 0;

  const totalSaves = place.totalSaves || friendsWhoSavedCount;

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      {/* Image Section */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img 
          src={place.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'} 
          alt={place.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Category badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-medium capitalize">
            {place.category}
          </span>
        </div>

        {/* New badge */}
        {place.isNew && (
          <div className="absolute top-4 right-4">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              NEW
            </span>
          </div>
        )}

        {/* Bottom overlay content */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 
            className="text-white font-bold text-lg mb-1 cursor-pointer hover:text-blue-200 transition-colors"
            onClick={onCardClick}
          >
            {place.name}
          </h3>
          <div className="flex items-center text-white/80 text-sm">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{cityName}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Likes */}
            <div className="flex items-center gap-1">
              <Heart className={cn("w-4 h-4", isLiked ? "fill-red-500 text-red-500" : "text-gray-400")} />
              <span className="text-sm font-medium text-gray-600">{place.likes}</span>
            </div>
            
            {/* Saves */}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">{totalSaves}</span>
            </div>
            
            {/* Visitors */}
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">{visitorsCount}</span>
            </div>
          </div>
          
          {place.popularity && (
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {place.popularity}% match
            </div>
          )}
        </div>

        {/* Added by section */}
        {place.addedBy && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">{place.addedBy.name[0]}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Added by </span>
                <span className="text-sm font-medium text-gray-900">{place.addedBy.name}</span>
              </div>
            </div>
            
            {place.addedDate && (
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(place.addedDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLikeToggle}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-200 text-sm font-medium",
              isLiked 
                ? "bg-red-50 text-red-600 border border-red-200" 
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            Like
          </button>
          
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 text-sm font-medium border border-blue-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 10v12"/>
              <path d="M15 5.88L22 2l-3.88 7L15 5.88z"/>
              <path d="M22 2L9 15"/>
            </svg>
            Suggest
          </button>
          
          <button
            onClick={onComment}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all duration-200 text-sm font-medium border border-purple-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Stories
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
