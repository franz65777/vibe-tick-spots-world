import { useNavigate, useParams } from 'react-router-dom';
import PostDetailModalMobile from '@/components/explore/PostDetailModalMobile';

export default function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  if (!postId) return null;

  return (
    <PostDetailModalMobile
      postId={postId}
      isOpen={true}
      onClose={() => navigate(-1)}
    />
  );
}
