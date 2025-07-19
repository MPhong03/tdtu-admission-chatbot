import { useSidebar } from "@/contexts/SidebarContext";
import { MenuOutlined, BellOutlined, LoadingOutlined, CrownOutlined, MessageOutlined, SettingOutlined, SoundOutlined } from "@ant-design/icons";
import { Badge, Dropdown, Typography, Button, Spin } from "antd";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BreadcrumbsTrail from "../breadcrumb";
import { SlideLeft } from "../animation";
import axiosClient from "@/api/axiosClient";
import { getVisitorId } from "@/utils/auth";

const { Text } = Typography;

interface Notification {
  _id: string;
  userId?: string;
  visitorId?: string;
  chatId: string;
  type: string;
  message: string;
  historyId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  items: Notification[];
  pagination: {
    page: number;
    size: number;
    hasMore: boolean;
    totalItems: number;
  };
}

const Header = () => {
  const { isOpen, toggle } = useSidebar();
  const navigate = useNavigate();
  
  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const pageSize = 10;

  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch notifications from axiosClient
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const visitorId = getVisitorId();
      const response = await axiosClient.get('/notifications', {
        params: {
          page,
          size: pageSize,
          visitorId
        }
      });

      if (response.data.Code === 1) {
        const data: NotificationResponse = response.data.Data;
        
        if (append) {
          setNotifications(prev => [...prev, ...data.items]);
        } else {
          setNotifications(data.items);
        }
        
        setHasMore(data.pagination.hasMore);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load initial notifications
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await axiosClient.post(`/notifications/${notification._id}/read`);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notification._id
            ? { ...n, isRead: true }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    await markAsRead(notification);
    
    // Navigate to chat page
    if (notification.chatId) {
      setDropdownVisible(false);
      navigate(`/chat/${notification.chatId}`);
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchNotifications(currentPage + 1, true);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: { icon: React.ReactNode; color: string } } = {
      'admin_reply': { 
        icon: <CrownOutlined />, 
        color: 'text-purple-500' 
      },
      'info': { 
        icon: <MessageOutlined />, 
        color: 'text-blue-500' 
      },
      'system': { 
        icon: <SettingOutlined />, 
        color: 'text-gray-500' 
      }
    };
    
    return iconMap[type] || { 
      icon: <SoundOutlined />, 
      color: 'text-orange-500' 
    };
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const notificationContent = (
    <div className="w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
      {/* Header với gradient */}
      <div className="px-4 py-3 bg-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOutlined className="text-white text-lg" />
            <Text className="text-white font-semibold">Thông báo</Text>
          </div>
          {unreadCount > 0 && (
            <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Text className="text-white text-xs font-medium">
                {unreadCount} mới
              </Text>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <Spin size="large" />
            <div className="mt-3">
              <Text className="text-gray-500 text-sm">Đang tải thông báo...</Text>
            </div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                  !item.isRead ? 'bg-blue-50/50 border-l-3 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Ant Design icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center ${getNotificationIcon(item.type).color}`}>
                        {getNotificationIcon(item.type).icon}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Text 
                        className={`block text-sm leading-5 ${
                          !item.isRead ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}
                      >
                        {truncateText(item.message, 50)}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        {formatTimeAgo(item.createdAt)}
                      </Text>
                    </div>
                  </div>
                  
                  {!item.isRead && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-3 text-center border-t border-gray-100">
                <Button
                  type="text"
                  size="small"
                  onClick={loadMore}
                  loading={loadingMore}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                  icon={loadingMore ? <LoadingOutlined /> : null}
                >
                  {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BellOutlined className="text-2xl text-gray-400" />
            </div>
            <Text className="text-gray-500 text-sm">Không có thông báo mới</Text>
            <Text className="text-gray-400 text-xs mt-1">
              Bạn sẽ nhận được thông báo khi có hoạt động mới
            </Text>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <header className="bg-white p-3 shadow overflow-hidden">
      <SlideLeft>
        <div className="h-7 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {!isOpen ? (
              <div className="icon-hover" onClick={toggle}>
                <MenuOutlined style={{ fontSize: 18 }} />
              </div>
            ) : (
              <div></div>
            )}
            <BreadcrumbsTrail />
          </div>

          <div>
            <Dropdown
              overlay={notificationContent}
              trigger={['click']}
              placement="bottomRight"
              open={dropdownVisible}
              onOpenChange={setDropdownVisible}
            >
              <div className="icon-hover cursor-pointer">
                <Badge count={unreadCount} size="small">
                  <BellOutlined style={{ fontSize: 18 }} />
                </Badge>
              </div>
            </Dropdown>
          </div>
        </div>
      </SlideLeft>
    </header>
  );
};

export default Header;
