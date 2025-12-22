import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import FolderDetailModal from '@/components/profile/FolderDetailModal';

const FolderDetailPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track where we came from and scroll position
  const [originPath, setOriginPath] = useState<string>('/feed');
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const hasHandledOpenLocation = useRef(false);
  
  useEffect(() => {
    // Capture the referrer on first mount
    const state = location.state as any;
    if (state?.from) {
      setOriginPath(state.from);
    }
    if (state?.scrollY !== undefined) {
      setScrollPosition(state.scrollY);
    }
    
    // If we have a location to open immediately (from profile modal click)
    if (state?.openLocation && !hasHandledOpenLocation.current) {
      hasHandledOpenLocation.current = true;
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
    // Navigate back to where we came from, restoring scroll position if from feed
    navigate(originPath, { 
      state: { 
        restoreScroll: scrollPosition 
      },
      replace: true
    });
  };

  const handleLocationClick = (locationData: any) => {
    // Navigate to home with location data
    // Pass complete returnToState so we can fully restore context when coming back
    navigate('/', { 
      state: { 
        selectedLocation: locationData,
        returnTo: originPath,
        returnToState: { 
          from: originPath, 
          scrollY: scrollPosition,
          folderId: folderId
        }
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
