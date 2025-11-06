import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PostDetailModalMobile from '@/components/explore/PostDetailModalMobile';
import { useTranslation } from 'react-i18next';

export default function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  const fromNotifications = location.state?.fromNotifications;

  if (!postId) return null;

  const handleClose = () => {
    if (fromNotifications) {
      navigate('/notifications');
    } else {
      navigate(-1);
    }
  };

  return (
    <PostDetailModalMobile
      postId={postId}
      isOpen={true}
      onClose={handleClose}
      showBackButton={true}
      backLabel={fromNotifications ? t('notifications', { ns: 'common' }) : t('back', { ns: 'common' })}
    />
  );
}
