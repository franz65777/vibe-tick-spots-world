import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import FolderDetailModal from '@/components/profile/FolderDetailModal';

const FolderDetailPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track where we came from (feed, profile, etc.)
  const [originPath, setOriginPath] = useState<string>('/feed');
  
  useEffect(() => {
    // Capture the referrer on first mount
    const state = location.state as any;
    if (state?.from) {
      setOriginPath(state.from);
    } else {
      // Try to detect from document referrer or default to feed
      const referrer = document.referrer;
      if (referrer.includes('/profile')) {
        setOriginPath('/profile');
      } else {
        setOriginPath('/feed');
      }
    }
    
    // If we have a location to open immediately (from profile modal click)
    if (state?.openLocation) {
      // Small delay to let the modal render first
      setTimeout(() => {
        handleLocationClick(state.openLocation);
      }, 100);
    }
  }, []);

  if (!folderId) {
    navigate('/feed');
    return null;
  }

  const handleClose = () => {
    // Navigate back to where we came from
    navigate(originPath);
  };

  const handleLocationClick = (locationData: any) => {
    // Navigate to home with location data, returnTo points back to this folder
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
