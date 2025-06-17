
export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isViewed: boolean;
  locationId: string;
  locationName: string;
  locationCategory?: string;
}

export const demoStories: Story[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah',
    userAvatar: 'photo-1494790108755-2616b5a5c75b',
    isViewed: false,
    locationId: 'loc1',
    locationName: 'Mario\'s Pizza Palace',
    locationCategory: 'restaurant'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Mike',
    userAvatar: 'photo-1507003211169-0a1dd7228f2d',
    isViewed: true,
    locationId: 'loc2',
    locationName: 'Blue Bottle Coffee',
    locationCategory: 'cafe'
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma',
    userAvatar: 'photo-1438761681033-6461ffad8d80',
    isViewed: false,
    locationId: 'loc3',
    locationName: 'Sunset View Restaurant',
    locationCategory: 'restaurant'
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'Alex',
    userAvatar: 'photo-1472099645785-5658abf4ff4e',
    isViewed: false,
    locationId: 'loc4',
    locationName: 'The Cozy Corner Café',
    locationCategory: 'cafe'
  }
];
