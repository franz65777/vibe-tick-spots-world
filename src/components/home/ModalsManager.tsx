
import CreateStoryModal from '@/components/CreateStoryModal';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationPostLibrary from '@/components/explore/LocationPostLibrary';
import StoriesViewer from '@/components/StoriesViewer';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  address?: string;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  locationId: string;
  locationName: string;
  locationAddress: string;
  timestamp: string;
  bookingUrl?: string;
  locationCategory?: string;
}

interface ModalsManagerProps {
  isCreateStoryModalOpen: boolean;
  isShareModalOpen: boolean;
  isCommentModalOpen: boolean;
  isLocationDetailOpen: boolean;
  isStoriesViewerOpen: boolean;
  sharePlace: Place | null;
  commentPlace: Place | null;
  locationDetailPlace: Place | null;
  stories: Story[];
  currentStoryIndex: number;
  onCreateStoryModalClose: () => void;
  onShareModalClose: () => void;
  onCommentModalClose: () => void;
  onLocationDetailClose: () => void;
  onStoriesViewerClose: () => void;
  onStoryCreated: () => void;
  onShare: (friendIds: string[], place: Place) => void;
  onCommentSubmit: (text: string, place: Place) => void;
  onStoryViewed: (storyId: string) => void;
  onReplyToStory?: (storyId: string, userId: string, message: string) => Promise<void>;
  onLocationClick?: (locationId: string) => void;
}

const ModalsManager = ({
  isCreateStoryModalOpen,
  isShareModalOpen,
  isCommentModalOpen,
  isLocationDetailOpen,
  isStoriesViewerOpen,
  sharePlace,
  commentPlace,
  locationDetailPlace,
  stories,
  currentStoryIndex,
  onCreateStoryModalClose,
  onShareModalClose,
  onCommentModalClose,
  onLocationDetailClose,
  onStoriesViewerClose,
  onStoryCreated,
  onShare,
  onCommentSubmit,
  onStoryViewed,
  onReplyToStory,
  onLocationClick
}: ModalsManagerProps) => {
  return (
    <>
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={onCreateStoryModalClose}
        onStoryCreated={onStoryCreated}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onShareModalClose}
        item={sharePlace}
        itemType="place"
        onShare={onShare}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={onCommentModalClose}
        place={commentPlace}
        onCommentSubmit={onCommentSubmit}
      />

      {locationDetailPlace && (
        <LocationPostLibrary
          isOpen={isLocationDetailOpen}
          onClose={onLocationDetailClose}
          place={locationDetailPlace}
        />
      )}

      {isStoriesViewerOpen && (
        <StoriesViewer
          stories={stories}
          initialStoryIndex={currentStoryIndex}
          onClose={onStoriesViewerClose}
          onStoryViewed={onStoryViewed}
          onReplyToStory={onReplyToStory}
          onLocationClick={onLocationClick}
        />
      )}
    </>
  );
};

export default ModalsManager;
