import { Folder, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface FolderMessageCardProps {
  folderData: any;
}

const FolderMessageCard = ({ folderData }: FolderMessageCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = () => {
    if (!folderData) {
      console.error('No folder data available');
      return;
    }

    const folderId = folderData.folder_id || folderData.id;
    
    // Navigate to the saved locations list with the folder pre-selected
    navigate('/profile', {
      state: { openFolderId: folderId }
    });
  };

  if (!folderData) {
    return (
      <div className="w-full p-3 text-center text-muted-foreground text-sm">
        {t('listNotAvailable', { ns: 'messages' })}
      </div>
    );
  }

  const creatorUsername =
    typeof folderData?.creator === 'string'
      ? folderData.creator
      : folderData?.creator?.username || folderData?.username;

  return (
    <button
      onClick={handleClick}
      className="w-full text-left hover:opacity-90 transition-opacity rounded-xl overflow-hidden bg-card border border-border"
    >
      {/* Cover Image */}
      <div className="relative h-24 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {folderData.cover_image_url || folderData.cover_image ? (
          <img
            src={folderData.cover_image_url || folderData.cover_image}
            alt={folderData.name || 'Folder'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-8 h-8 text-primary/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
          {folderData.name || 'Lista'}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{folderData.location_count || 0} {t('places', { ns: 'messages' })}</span>
          </div>
          {creatorUsername && (
            <span className="truncate">@{creatorUsername}</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default FolderMessageCard;
