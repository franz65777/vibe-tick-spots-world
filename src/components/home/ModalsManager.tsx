
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
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
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
  selectedPlace: Place | null;
  isDetailSheetOpen: boolean;
  isNotificationsOpen: boolean;
  isMessagesOpen: boolean;
  isShareModalOpen: boolean;
  isCommentModalOpen: boolean;
  isCreateStoryModalOpen: boolean;
  onCloseDetailSheet: () => void;
  onCloseNotifications: () => void;
  onCloseMessages: () => void;
  onCloseShareModal: () => void;
  onCloseCommentModal: () => void;
  onCloseCreateStoryModal: () => void;
  onShare: (friendIds: string[], place: Place) => void;
  onComment: (text: string, place: Place) => void;
}

const ModalsManager = ({
  selectedPlace,
  isDetailSheetOpen,
  isNotificationsOpen,
  isMessagesOpen,
  isShareModalOpen,
  isCommentModalOpen,
  isCreateStoryModalOpen,
  onCloseDetailSheet,
  onCloseNotifications,
  onCloseMessages,
  onCloseShareModal,
  onCloseCommentModal,
  onCloseCreateStoryModal,
  onShare,
  onComment
}: ModalsManagerProps) => {
  return (
    <>
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={onCloseCreateStoryModal}
        onStoryCreated={() => {}}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={onCloseNotifications}
      />

      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={onCloseMessages}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onCloseShareModal}
        item={selectedPlace}
        itemType="place"
        onShare={onShare}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={onCloseCommentModal}
        place={selectedPlace}
        onCommentSubmit={onComment}
      />

      <LocationDetailSheet
        isOpen={isDetailSheetOpen}
        onClose={onCloseDetailSheet}
        location={selectedPlace}
      />
    </>
  );
};

export default ModalsManager;
