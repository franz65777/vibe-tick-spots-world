
import { useState } from 'react';
import { X, Send, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  isFollowing: boolean;
}

interface Place {
  id: string;
  name: string;
  category: string;
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  onCommentSubmit: (text: string, place: Place) => void;
}

const CommentModal = ({ isOpen, onClose, place, onCommentSubmit }: CommentModalProps) => {
  const [commentText, setCommentText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const mockComments: Comment[] = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Emma',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      text: 'Amazing place! The ambiance is perfect 👌',
      timestamp: '2h',
      likes: 12,
      isLiked: false,
      isFollowing: true
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Michael',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      text: 'Had the best coffee here yesterday!',
      timestamp: '4h',
      likes: 8,
      isLiked: true,
      isFollowing: true
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'RandomUser',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      text: 'Great location, highly recommend!',
      timestamp: '1d',
      likes: 5,
      isLiked: false,
      isFollowing: false
    },
    {
      id: '4',
      userId: 'user4',
      userName: 'AnotherUser',
      userAvatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      text: 'Perfect spot for a date night',
      timestamp: '2d',
      likes: 15,
      isLiked: false,
      isFollowing: false
    }
  ];

  // Sort comments: followed users first, then others
  const sortedComments = [...mockComments].sort((a, b) => {
    if (a.isFollowing && !b.isFollowing) return -1;
    if (!a.isFollowing && b.isFollowing) return 1;
    return 0;
  });

  const handleCommentSubmit = () => {
    if (commentText.trim() && place) {
      onCommentSubmit(commentText, place);
      setCommentText('');
    }
  };

  const handleCommentLike = (commentId: string) => {
    setLikedComments(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(commentId)) {
        newLiked.delete(commentId);
      } else {
        newLiked.add(commentId);
      }
      return newLiked;
    });
  };

  if (!isOpen || !place) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Comments</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Place Info */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium">{place.name}</h3>
          <p className="text-sm text-gray-500">{place.category}</p>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {/* User Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium">{comment.userName[0]}</span>
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    {comment.isFollowing && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Following</span>
                    )}
                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{comment.text}</p>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                    >
                      <Heart 
                        className={`w-3 h-3 ${
                          likedComments.has(comment.id) || comment.isLiked 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-gray-500'
                        }`} 
                      />
                      <span>
                        {comment.likes + (likedComments.has(comment.id) && !comment.isLiked ? 1 : 0)}
                      </span>
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-medium">Me</span>
            </div>
            <div className="flex-1 relative">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="pr-10 rounded-full border-gray-300"
                onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
              />
            </div>
            <button 
              onClick={handleCommentSubmit}
              disabled={!commentText.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
