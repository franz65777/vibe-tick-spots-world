
import { Heart, MessageCircle, MapPin } from 'lucide-react';

interface Post {
  id: string;
  image: string;
  likes: number;
  comments: number;
  location: string;
  caption: string;
  createdAt: string;
}

const PostsGrid = () => {
  // Demo posts - in real app this would come from props or hook
  const posts: Post[] = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
      likes: 42,
      comments: 8,
      location: 'Milan, Italy',
      caption: 'Amazing pasta at this hidden gem! 🍝',
      createdAt: '2024-06-01'
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
      likes: 31,
      comments: 5,
      location: 'Paris, France',
      caption: 'Perfect evening at this rooftop bar ✨',
      createdAt: '2024-05-28'
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop',
      likes: 67,
      comments: 12,
      location: 'San Francisco, CA',
      caption: 'Best coffee in the city! ☕',
      createdAt: '2024-05-25'
    },
    {
      id: '4',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
      likes: 89,
      comments: 15,
      location: 'New York, NY',
      caption: 'Incredible brunch spot 🥐',
      createdAt: '2024-05-20'
    },
    {
      id: '5',
      image: 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=400&h=400&fit=crop',
      likes: 23,
      comments: 3,
      location: 'Tokyo, Japan',
      caption: 'Traditional ramen house 🍜',
      createdAt: '2024-05-15'
    },
    {
      id: '6',
      image: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=400&h=400&fit=crop',
      likes: 56,
      comments: 9,
      location: 'Barcelona, Spain',
      caption: 'Tapas and good vibes 🍤',
      createdAt: '2024-05-10'
    }
  ];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Grid3X3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
        <p className="text-gray-600 text-sm">Start sharing your favorite places!</p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <img
              src={post.image}
              alt={post.caption}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with stats */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-end">
              <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-1">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-white fill-white" />
                    <span className="text-xs text-white font-medium">{post.likes}</span>
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">{post.comments}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 w-full opacity-0 hover:opacity-100 transition-opacity duration-200">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">{post.location}</span>
                  </div>
                  <p className="text-xs text-white line-clamp-2">{post.caption}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostsGrid;
