import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';

interface PostMessageCardProps {
  postData: {
    id?: string;
    post_id?: string;
    caption?: string | null;
    media_urls?: string[];
  };
}

const PostMessageCard = ({ postData }: PostMessageCardProps) => {
  const navigate = useNavigate();
  const cover = postData.media_urls && postData.media_urls.length > 0 ? postData.media_urls[0] : undefined;
  const hasMultipleMedia = postData.media_urls && postData.media_urls.length > 1;
  const postId = postData.id || postData.post_id;
  
  const handleClick = () => {
    if (postId) {
      navigate(`/post/${postId}`);
    }
  };
  
  return (
    <div 
      className="cursor-pointer active:opacity-90 transition-opacity"
      onClick={handleClick}
    >
      {cover ? (
        <div className="relative w-[120px] h-[120px]">
          {/* Stacked effect for multiple images */}
          {hasMultipleMedia && postData.media_urls!.length > 1 && (
            <div 
              className="absolute w-full h-full rounded-xl bg-muted overflow-hidden border border-border/50"
              style={{ 
                transform: 'translateX(8px) translateY(-6px) rotate(6deg)',
                zIndex: 0 
              }}
            >
              <img 
                src={postData.media_urls![1]} 
                alt="Post background" 
                className="w-full h-full object-cover opacity-80"
                loading="lazy"
              />
            </div>
          )}
          
          {/* Main image */}
          <div className="relative w-full h-full rounded-xl overflow-hidden border border-border shadow-sm" style={{ zIndex: 1 }}>
            <img 
              src={cover} 
              alt={postData.caption || 'Post'} 
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      ) : (
        <div className="w-[120px] h-[120px] bg-muted rounded-xl flex items-center justify-center border border-border">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}
      
      {postData.caption && (
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1 mt-1.5 max-w-[120px]">{postData.caption}</p>
      )}
    </div>
  );
};

export default PostMessageCard;
