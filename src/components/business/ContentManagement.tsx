
import React, { useState } from 'react';
import { Star, MessageSquare, Heart, TrendingUp, MoreVertical, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ContentManagementProps {
  locationId: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  imageUrl: string;
  likes: number;
  comments: number;
  timestamp: string;
  isPromoted: boolean;
  engagementRate: number;
}

const ContentManagement = ({ locationId }: ContentManagementProps) => {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'foodie_anna',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c26c?w=40&h=40&fit=crop&crop=face',
      content: 'Amazing pasta at this place! The ambiance is perfect for a romantic dinner 🍝✨',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
      likes: 89,
      comments: 12,
      timestamp: '2 hours ago',
      isPromoted: true,
      engagementRate: 12.5
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'travel_mike',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      content: 'Great service and atmosphere. Highly recommend the seafood special!',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      likes: 67,
      comments: 8,
      timestamp: '5 hours ago',
      isPromoted: false,
      engagementRate: 9.8
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'chef_sarah',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
      content: 'Love the new menu! The presentation is absolutely stunning 👨‍🍳',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      likes: 134,
      comments: 23,
      timestamp: '1 day ago',
      isPromoted: false,
      engagementRate: 15.2
    }
  ]);

  const handlePromotePost = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        toast.success(post.isPromoted ? 'Post unpromoted' : 'Post promoted to top!');
        return { ...post, isPromoted: !post.isPromoted };
      }
      return post;
    }));
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPromoted && !b.isPromoted) return -1;
    if (!a.isPromoted && b.isPromoted) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            Content Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage posts about your location. Promote high-quality content to increase visibility.
          </p>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-xl font-bold text-gray-900">{posts.length}</p>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promoted Posts</p>
                <p className="text-xl font-bold text-yellow-600">{posts.filter(p => p.isPromoted).length}</p>
              </div>
              <Pin className="w-6 h-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Engagement</p>
                <p className="text-xl font-bold text-green-600">
                  {(posts.reduce((acc, post) => acc + post.engagementRate, 0) / posts.length).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {sortedPosts.map((post) => (
          <Card key={post.id} className={`bg-white shadow-sm border ${post.isPromoted ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Post Image */}
                <div className="flex-shrink-0">
                  <img
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>

                {/* Post Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.userAvatar}
                        alt={post.userName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">@{post.userName}</p>
                        <p className="text-xs text-gray-500">{post.timestamp}</p>
                      </div>
                      {post.isPromoted && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          Promoted
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-gray-700 mb-3">{post.content}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {post.likes} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments} comments
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {post.engagementRate}% engagement
                      </span>
                    </div>

                    <Button
                      onClick={() => handlePromotePost(post.id)}
                      variant={post.isPromoted ? "outline" : "default"}
                      size="sm"
                      className={post.isPromoted ? "border-yellow-400 text-yellow-600 hover:bg-yellow-50" : ""}
                    >
                      <Pin className="w-4 h-4 mr-1" />
                      {post.isPromoted ? 'Unpromote' : 'Promote'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ContentManagement;
