
import CreateStoryModal from '@/components/CreateStoryModal';
import NotificationsModal from '@/components/NotificationsModal';
import MessagesModal from '@/components/MessagesModal';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import LocationDetailSheet from '@/components/LocationDetailSheet';
import StoriesViewer from '@/components/StoriesViewer';
import { Place } from '@/types/place';

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
  onCloseSelectedPlace: () => void;
  sharePlace: Place | null;
  onCloseShare: () => void;
  commentPlace: Place | null;
  onCloseComment: () => void;
  onCommentSubmit: (comment: string) => void;
  isCreateStoryModalOpen: boolean;
  onCloseCreateStory: () => void;
  likedPlaces: Set<string>;
  onToggleLike: (placeId: string) => void;
}

const ModalsManager = ({
  selectedPlace,
  onCloseSelectedPlace,
  sharePlace,
  onCloseShare,
  commentPlace,
  onCloseComment,
  onCommentSubmit,
  isCreateStoryModalOpen,
  onCloseCreateStory,
  likedPlaces,
  onToggleLike
}: ModalsManagerProps) => {
  return (
    <>
      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={onCloseCreateStory}
        onStoryCreated={() => {}}
      />

      <ShareModal
        isOpen={!!sharePlace}
        onClose={onCloseShare}
        item={sharePlace}
        itemType="place"
        onShare={() => {}}
      />

      <CommentModal
        isOpen={!!commentPlace}
        onClose={onCloseComment}
        place={commentPlace}
        onCommentSubmit={onCommentSubmit}
      />

      <LocationDetailSheet
        isOpen={!!selectedPlace}
        onClose={onCloseSelectedPlace}
        location={selectedPlace}
        onLike={() => selectedPlace && onToggleLike(selectedPlace.id)}
        isLiked={selectedPlace ? likedPlaces.has(selectedPlace.id) : false}
        onSave={() => {}}
        isSaved={false}
      />
    </>
  );
};

export default ModalsManager;
