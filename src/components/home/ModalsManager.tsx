
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationDetailSheet from '@/components/LocationDetailSheet';
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
  isNotificationsModalOpen: boolean;
  isMessagesModalOpen: boolean;
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
  onNotificationsModalClose: () => void;
  onMessagesModalClose: () => void;
  onShareModalClose: () => void;
  onCommentModalClose: () => void;
  onLocationDetailClose: () => void;
  onStoriesViewerClose: () => void;
  onStoryCreated: () => void;
  onShare: (friendIds: string[], place: Place) => void;
  onCommentSubmit: (text: string, place: Place) => void;
  onStoryViewed: (storyId: string) => void;
}

const ModalsManager = ({
  isCreateStoryModalOpen,
  isNotificationsModalOpen,
  isMessagesModalOpen,
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
  onNotificationsModalClose,
  onMessagesModalClose,
  onShareModalClose,
  onCommentModalClose,
  onLocationDetailClose,
  onStoriesViewerClose,
  onStoryCreated,
  onShare,
  onCommentSubmit,
  onStoryViewed
}: ModalsManagerProps) => {
  return (
    <>
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={onCreateStoryModalClose}
        onStoryCreated={onStoryCreated}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={onNotificationsModalClose}
      />

      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={onMessagesModalClose}
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

      <LocationDetailSheet
        isOpen={isLocationDetailOpen}
        onClose={onLocationDetailClose}
        location={locationDetailPlace}
        onLike={() => {}}
        isLiked={false}
        onSave={() => {}}
        isSaved={false}
      />

      {isStoriesViewerOpen && (
        <StoriesViewer
          stories={stories}
          initialStoryIndex={currentStoryIndex}
          onClose={onStoriesViewerClose}
          onStoryViewed={onStoryViewed}
        />
      )}
    </>
  );
};

export default ModalsManager;
