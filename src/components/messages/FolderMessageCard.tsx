import { Folder, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FolderMessageCardProps {
  folderData: any;
}

const FolderMessageCard = ({ folderData }: FolderMessageCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (folderData.folder_id) {
      navigate(`/profile/${folderData.creator_id}`, {
        state: { openFolderId: folderData.folder_id }
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left hover:opacity-90 transition-opacity"
    >
      {/* Cover Image */}
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-xl overflow-hidden">
        {folderData.cover_image_url ? (
          <img
            src={folderData.cover_image_url}
            alt={folderData.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-12 h-12 text-primary/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-1">
          {folderData.name}
        </h3>
        
        {folderData.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {folderData.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{folderData.location_count || 0} luoghi</span>
          </div>
          {folderData.creator && (
            <span>@{folderData.creator}</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default FolderMessageCard;
