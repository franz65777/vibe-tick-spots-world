import chatIconImg from '@/assets/icons/chat-icon.png';

interface ChatIconProps {
  className?: string;
  size?: number;
}

/**
 * Custom chat icon component that uses the uploaded chat bubble image.
 * Automatically crops the transparent margins.
 */
export const ChatIcon = ({ className = '', size = 24 }: ChatIconProps) => {
  return (
    <img 
      src={chatIconImg} 
      alt="" 
      className={className}
      style={{ 
        width: size, 
        height: size,
        objectFit: 'contain',
        objectPosition: 'center'
      }}
    />
  );
};

export default ChatIcon;
