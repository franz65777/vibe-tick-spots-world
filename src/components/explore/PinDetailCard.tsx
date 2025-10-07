import React from 'react';
import { X, MapPin, Users, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePinEngagement } from '@/hooks/usePinEngagement';

interface PinDetailCardProps {
  pin: {
    id: string;
    name: string;
    city?: string;
    coordinates: { lat: number; lng: number };
    google_place_id?: string;
  };
  onClose: () => void;
}

export const PinDetailCard = ({ pin, onClose }: PinDetailCardProps) => {
  const { engagement, loading } = usePinEngagement(
    pin.google_place_id ? null : pin.id,
    pin.google_place_id || null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 truncate flex-1 mr-4">
            {pin.name}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Info */}
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 rounded-full p-2">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-base text-gray-900">{pin.city || 'Unknown'}</p>
            </div>
          </div>

          {/* Total Saves */}
          <div className="flex items-start gap-3">
            <div className="bg-purple-50 rounded-full p-2">
              <Bookmark className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Total Saves</p>
              {loading ? (
                <div className="h-6 w-16 bg-gray-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {engagement?.totalSaves || 0}
                </p>
              )}
            </div>
          </div>

          {/* Followed Users Who Saved */}
          {!loading && engagement && engagement.followedUsers.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="bg-green-50 rounded-full p-2">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Friends who saved this
                </p>
                <div className="flex flex-wrap gap-3">
                  {engagement.followedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                          {user.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700">
                        {user.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Friends Saved Message */}
          {!loading && engagement && engagement.followedUsers.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                None of your friends have saved this yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
