import { useState, useRef, useCallback } from 'react';
import { Place } from '@/types/place';
import type { GuidedTourStep } from '@/components/onboarding/GuidedTour';
interface LocalPlace {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  isFollowing?: boolean;
  addedBy?: string;
  addedDate?: string;
  popularity?: number;
  city?: string;
  isNew: boolean;
  image?: string;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  distance?: string | number;
  totalSaves?: number;
  address?: string;
}

export interface HomePageState {
  // Map state
  selectedCity: string;
  selectedPlace: Place | null;
  mapCenter: { lat: number; lng: number };
  recenterToken: number;
  userLocation: { lat: number; lng: number } | null;
  isMapExpanded: boolean;
  initialPinToShow: Place | null;
  isCenteredOnUser: boolean;
  
  // Search state
  searchQuery: string;
  currentCity: string;
  isSearchOverlayOpen: boolean;
  isSearchDrawerOpen: boolean;
  
  // Modal states
  isAnyModalOpen: boolean;
  isCreateStoryModalOpen: boolean;
  isShareModalOpen: boolean;
  isCommentModalOpen: boolean;
  isLocationDetailOpen: boolean;
  isStoriesViewerOpen: boolean;
  sharePlace: LocalPlace | null;
  commentPlace: LocalPlace | null;
  locationDetailPlace: LocalPlace | null;
  currentStoryIndex: number;
  
  // Navigation state
  returnTo: string | null;
  returnToState: any;
  fromMessages: boolean;
  returnToUserId: string | null;
  mapSelectedPlace: Place | null;
  
  // Onboarding/tour
  showOnboarding: boolean;
  checkingOnboarding: boolean;
  showGuidedTour: boolean;
  guidedTourStep: GuidedTourStep;
  showLogo: boolean;
}

export function useHomePageState() {
  // Map state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('lastMapCenter');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { lat: 37.7749, lng: -122.4194 };
  });
  const [recenterToken, setRecenterToken] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [initialPinToShow, setInitialPinToShow] = useState<Place | null>(null);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  
  // Modal states
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isLocationDetailOpen, setIsLocationDetailOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [sharePlace, setSharePlace] = useState<LocalPlace | null>(null);
  const [commentPlace, setCommentPlace] = useState<LocalPlace | null>(null);
  const [locationDetailPlace, setLocationDetailPlace] = useState<LocalPlace | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  // Navigation state
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [returnToState, setReturnToState] = useState<any>(null);
  const [fromMessages, setFromMessages] = useState(false);
  const [returnToUserId, setReturnToUserId] = useState<string | null>(null);
  const [mapSelectedPlace, setMapSelectedPlace] = useState<Place | null>(null);
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [guidedTourStep, setGuidedTourStep] = useState<GuidedTourStep>('profile-photo');
  const [showLogo, setShowLogo] = useState(() => {
    const hasShownLogo = sessionStorage.getItem('hasShownSpottLogo');
    if (!hasShownLogo) {
      sessionStorage.setItem('hasShownSpottLogo', 'true');
      return true;
    }
    return false;
  });
  
  // Refs
  const ignoreMoveEventRef = useRef(false);
  const reopenSearchDrawerRef = useRef<(() => void) | null>(null);
  const pendingOpenSearchAfterPinCloseRef = useRef(false);
  const pendingOpenSearchAttemptsRef = useRef(0);
  const hasInitializedLocation = useRef(false);
  const closeSelectedPlaceRef = useRef<(() => void) | null>(null);

  // Memoized handlers
  const incrementRecenterToken = useCallback(() => {
    setRecenterToken((v) => v + 1);
  }, []);

  const handleCenterStatusChange = useCallback((isCentered: boolean) => {
    if (isCentered) {
      ignoreMoveEventRef.current = true;
    }
    setIsCenteredOnUser(isCentered);
  }, []);

  return {
    // State
    selectedCity, setSelectedCity,
    selectedPlace, setSelectedPlace,
    mapCenter, setMapCenter,
    recenterToken, setRecenterToken,
    userLocation, setUserLocation,
    isMapExpanded, setIsMapExpanded,
    initialPinToShow, setInitialPinToShow,
    isCenteredOnUser, setIsCenteredOnUser,
    searchQuery, setSearchQuery,
    currentCity, setCurrentCity,
    isSearchOverlayOpen, setIsSearchOverlayOpen,
    isSearchDrawerOpen, setIsSearchDrawerOpen,
    isAnyModalOpen, setIsAnyModalOpen,
    isCreateStoryModalOpen, setIsCreateStoryModalOpen,
    isShareModalOpen, setIsShareModalOpen,
    isCommentModalOpen, setIsCommentModalOpen,
    isLocationDetailOpen, setIsLocationDetailOpen,
    isStoriesViewerOpen, setIsStoriesViewerOpen,
    sharePlace, setSharePlace,
    commentPlace, setCommentPlace,
    locationDetailPlace, setLocationDetailPlace,
    currentStoryIndex, setCurrentStoryIndex,
    returnTo, setReturnTo,
    returnToState, setReturnToState,
    fromMessages, setFromMessages,
    returnToUserId, setReturnToUserId,
    mapSelectedPlace, setMapSelectedPlace,
    showOnboarding, setShowOnboarding,
    checkingOnboarding, setCheckingOnboarding,
    showGuidedTour, setShowGuidedTour,
    guidedTourStep, setGuidedTourStep,
    showLogo, setShowLogo,
    
    // Refs
    ignoreMoveEventRef,
    reopenSearchDrawerRef,
    pendingOpenSearchAfterPinCloseRef,
    pendingOpenSearchAttemptsRef,
    hasInitializedLocation,
    closeSelectedPlaceRef,
    
    // Handlers
    incrementRecenterToken,
    handleCenterStatusChange,
  };
}
