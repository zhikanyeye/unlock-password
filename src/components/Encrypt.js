import React, { useState } from 'react';
import { Input, Button, Modal } from 'antd';

export default function Encrypt({ onEncrypt }) {
  const [secretKey, setSecretKey] = useState('');
  const [content, setContent] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminKey = (value) => {
    if (value === process.env.REACT_APP_ADMIN_KEY) {
      setIsAdmin(true);
      setModalVisible(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleEncrypt = () => {
    const expiration = isAdmin ? 'permanent' : new Date(Date.now() + 180*24*60*60*1000);
    onEncrypt({
      content,
      key: secretKey,
      expiration
    });
  };

  return (
    <div className="encrypt-container">
      <Input.TextArea
        placeholder="输入待加密内容"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoSize={{ minRows: 4 }}
      />
      <Input
        placeholder="输入加密密钥"
        value={secretKey}
        onChange={(e) => {
          setSecretKey(e.target.value);
          checkAdminKey(e.target.value);
        }}
        style={{ margin: '16px 0' }}
      />
      <Button 
        type="primary" 
        onClick={handleEncrypt}
        disabled={!content || !secretKey}
      >
        生成加密链接
      </Button>

      <Modal
        title="过期提醒"
        visible={modalVisible}
        onOk={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      >
        {isAdmin ? 
          '管理员模式：密文将永久有效' : 
          '普通模式：密文将在180天后自动过期'
        }
      </Modal>
    </div>
  );
}