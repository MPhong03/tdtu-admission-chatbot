import React from 'react';
import { Alert, Button } from 'antd';
import { InfoCircleOutlined, UserAddOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { RateLimitInfo } from '@/services/rateLimitService';

interface RateLimitBannerProps {
  info: RateLimitInfo;
  onUpgradeClick?: () => void;
  showUpgradeButton?: boolean;
}

const RateLimitBanner: React.FC<RateLimitBannerProps> = ({
  info,
  onUpgradeClick,
  showUpgradeButton = true
}) => {
  const getRemainingText = () => {
    if (info.remaining === 0) {
      return 'Bạn đã hết lượt chat';
    }
    return `Bạn còn ${info.remaining} lượt chat`;
  };

  const getTimeUntilReset = () => {
    const hours = Math.floor(info.resetIn / 3600);
    const minutes = Math.floor((info.resetIn % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    }
    return `${minutes} phút`;
  };

  const getAlertType = () => {
    if (info.remaining === 0) return 'error';
    if (info.remaining <= 5) return 'warning';
    return 'info';
  };

  const getAlertIcon = () => {
    if (info.remaining === 0) return <ClockCircleOutlined />;
    if (info.remaining <= 5) return <InfoCircleOutlined />;
    return <InfoCircleOutlined />;
  };

  return (
    <div className="mb-4">
      <Alert
        message={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getAlertIcon()}
              <span className="font-medium">{getRemainingText()}</span>
            </div>
            {showUpgradeButton && (
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={onUpgradeClick}
                className="ml-2"
              >
                Đăng ký ngay
              </Button>
            )}
          </div>
        }
        description={
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ClockCircleOutlined className="text-gray-500" />
              <span className="text-gray-600">
                Giới hạn sẽ được reset sau: <strong>{getTimeUntilReset()}</strong>
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <InfoCircleOutlined className="text-gray-500" />
              <span className="text-gray-600">
                Thời gian reset: <strong>{info.resetTime}</strong>
              </span>
            </div>

            {info.remaining === 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <UserAddOutlined className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">💡 Khuyến nghị:</div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Đăng ký tài khoản để chat không giới hạn</li>
                      <li>Lưu trữ lịch sử chat của bạn</li>
                      <li>Truy cập các tính năng nâng cao</li>
                      <li>Nhận thông báo và cập nhật mới nhất</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {info.remaining > 0 && info.remaining <= 5 && (
              <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <InfoCircleOutlined className="text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <div className="font-medium mb-1">⚠️ Lưu ý:</div>
                    <p>Bạn sắp hết lượt chat. Hãy cân nhắc đăng ký tài khoản để tiếp tục sử dụng dịch vụ.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
        type={getAlertType()}
        showIcon={false}
        className="border-0 shadow-sm"
        action={
          showUpgradeButton && info.remaining === 0 ? (
            <Button
              type="primary"
              size="middle"
              icon={<UserAddOutlined />}
              onClick={onUpgradeClick}
              className="ml-2"
            >
              Đăng ký tài khoản
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};

export default RateLimitBanner;