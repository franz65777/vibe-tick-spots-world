import { useParams, useNavigate } from 'react-router-dom';
import FolderDetailModal from '@/components/profile/FolderDetailModal';

const FolderDetailPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  if (!folderId) {
    navigate('/feed');
    return null;
  }

  return (
    <FolderDetailModal
      folderId={folderId}
      isOpen={true}
      onClose={() => navigate(-1)}
    />
  );
};

export default FolderDetailPage;
