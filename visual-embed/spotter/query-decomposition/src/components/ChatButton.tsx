import { Button } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

interface ChatButtonProps {
  onClick: () => void;
}

const ChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  return (
    <Button
      type="primary"
      shape="circle"
      icon={<MessageOutlined />}
      size="large"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
      }}
    />
  );
};

export default ChatButton; 