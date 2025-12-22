import { useParams, useNavigate, useLocation } from 'react-router-dom';
import FolderDetailModal from '@/components/profile/FolderDetailModal';

const FolderDetailPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!folderId) {
    navigate('/feed');
    return null;
  }

  const handleClose = () => {
    // If we have history, go back, otherwise go to feed
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/feed');
    }
  };

  const handleLocationClick = (locationData: any) => {
    // Navigate to home with location data
    navigate('/', { 
      state: { 
        selectedLocation: locationData,
        returnTo: location.pathname
      } 
    });
  };

  return (
    <FolderDetailModal
      folderId={folderId}
      isOpen={true}
      onClose={handleClose}
      onLocationClick={handleLocationClick}
    />
  );
};

export default FolderDetailPage;
