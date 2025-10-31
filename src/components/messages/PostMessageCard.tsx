
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PostMessageCardProps {
  postData: {
    id: string;
    caption?: string | null;
    media_urls?: string[];
  };
}

const PostMessageCard = ({ postData }: PostMessageCardProps) => {
  const cover = postData.media_urls && postData.media_urls.length > 0 ? postData.media_urls[0] : undefined;
  const hasMultipleMedia = postData.media_urls && postData.media_urls.length > 1;
  
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm max-w-[280px]">
      {cover ? (
        <div className="relative w-full h-48 bg-muted">
          <img 
            src={cover} 
            alt={postData.caption || 'Post'} 
            className="w-full h-full object-cover"
          />
          {hasMultipleMedia && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {postData.media_urls!.length}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}
      
      {postData.caption && (
        <div className="p-3">
          <p className="text-[13px] text-foreground leading-snug line-clamp-3">{postData.caption}</p>
        </div>
      )}
    </div>
  );
};

export default PostMessageCard;
