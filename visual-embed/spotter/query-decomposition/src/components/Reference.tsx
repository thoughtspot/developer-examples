import { Typography, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk/react';

const { Text } = Typography;

interface ReferenceProps {
  visible: boolean;
  onClose: () => void;
  content: string;
}

const Reference: React.FC<ReferenceProps> = ({ visible, onClose, content }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 800,
        width: 820,
        height: '100vh',
        backgroundColor: 'white',
        borderRight: '1px solid #f0f0f0',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.1s ease-in-out',
        transform: visible ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'right',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      </div>
      <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <SpotterEmbed
          style={{ height: '100%', width: '100%', zoom: 0.9 }}
          worksheetId={import.meta.env.VITE_TS_DATASOURCE_ID}
          searchOptions={{
            searchQuery: content,
          }}
          ></SpotterEmbed>
      </div>
    </div>
  );
};

export default Reference; 