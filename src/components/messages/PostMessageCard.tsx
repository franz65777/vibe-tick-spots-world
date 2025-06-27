
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PostMessageCardProps {
  postData: {
    id: string;
    caption?: string | null;
    media_urls?: string[];
  };
}

const PostMessageCard = ({ postData }: PostMessageCardProps) => {
  const cover = postData.media_urls && postData.media_urls.length > 0 ? postData.media_urls[0] : undefined;
  return (
    <Card className="max-w-sm overflow-hidden">
      {cover && (
        <img src={cover} alt={postData.caption || 'Post image'} className="w-full h-32 object-cover" />
      )}
      <CardContent className="p-2">
        {postData.caption && <p className="text-sm line-clamp-2">{postData.caption}</p>}
      </CardContent>
    </Card>
  );
};

export default PostMessageCard;
