import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PostMessageCardProps {
  postData: {
    id?: string;
    post_id?: string; // backward compatibility
    caption?: string | null;
    media_urls?: string[];
    user_id?: string;
    username?: string;
    avatar_url?: string | null;
  };
}

const PostMessageCard = ({ postData }: PostMessageCardProps) => {
  const navigate = useNavigate();
  const mediaUrls = postData.media_urls || [];
  const hasMedia = mediaUrls.length > 0;
  const hasMultipleMedia = mediaUrls.length > 1;
  const firstImage = hasMedia ? mediaUrls[0] : undefined;
  const postId = postData.id || postData.post_id; // backward compatibility
  
  const handleClick = () => {
    if (postId) {
      navigate(`/post/${postId}`);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (postData.user_id) {
      navigate(`/profile/${postData.user_id}`);
    }
  };
  
  return (
    <div 
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm max-w-[280px] cursor-pointer active:opacity-90 transition-opacity"
      onClick={handleClick}
    >
      {/* User header */}
      {postData.username && (
        <div className="flex items-center gap-2 p-3 pb-2">
          <button onClick={handleAvatarClick} className="shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={postData.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {postData.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <button 
            onClick={handleAvatarClick}
            className="font-semibold text-sm text-foreground hover:opacity-70 truncate"
          >
            {postData.username}
          </button>
        </div>
      )}

      {/* Media section with stacked effect for multiple images */}
      {hasMedia ? (
        <div className={`relative ${hasMultipleMedia ? 'mt-3' : ''}`}>
          {/* Stacked images effect for multiple media - behind the main image */}
          {hasMultipleMedia && (
            <>
              {/* Back layer */}
              {mediaUrls.length > 2 && (
                <div 
                  className="absolute top-0 left-1/2 w-[85%] aspect-square rounded-xl bg-muted/50 border border-border/30 z-0" 
                  style={{ 
                    transform: 'translateX(-50%) translateY(-8px) rotate(6deg)',
                  }}
                />
              )}
              {/* Middle layer */}
              <div 
                className="absolute top-0 left-1/2 w-[90%] aspect-square rounded-xl bg-muted/70 border border-border/50 z-10" 
                style={{ 
                  transform: 'translateX(-50%) translateY(-4px) rotate(-3deg)',
                }}
              />
            </>
          )}
          
          {/* Main image */}
          <div className="relative z-20">
            <div className="aspect-square w-full bg-muted overflow-hidden rounded-none">
              <img 
                src={firstImage} 
                alt={postData.caption || 'Post'} 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Multiple images indicator */}
            {hasMultipleMedia && (
              <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {mediaUrls.length}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}
      
      {/* Caption at bottom */}
      {postData.caption && (
        <div className="p-3 pt-2">
          <p className="text-[13px] text-foreground leading-snug line-clamp-2">
            {postData.username && (
              <span className="font-semibold">{postData.username} </span>
            )}
            {postData.caption}
          </p>
        </div>
      )}
    </div>
  );
};

export default PostMessageCard;
