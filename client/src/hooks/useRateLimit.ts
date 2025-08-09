import { useState, useEffect, useCallback } from 'react';
import rateLimitService, { RateLimitInfo } from '@/services/rateLimitService';
import { getVisitorId } from '@/utils/auth';

export const useRateLimit = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = useCallback(async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    
    setIsChecking(true);
    try {
      const result = await rateLimitService.canSendMessage();
      if (result.info) {
        setRateLimitInfo(result.info);
      }
    } catch (error) {
      console.error('[useRateLimit] Error checking rate limit:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const refreshRateLimit = useCallback(async () => {
    await checkRateLimit();
  }, [checkRateLimit]);

  const canSendMessage = useCallback(() => {
    if (!rateLimitInfo) return true; // User đã đăng nhập hoặc không thể kiểm tra
    return !rateLimitInfo.isLimited;
  }, [rateLimitInfo]);

  const getRemainingCount = useCallback(() => {
    return rateLimitInfo?.remaining ?? null;
  }, [rateLimitInfo]);

  const getResetTime = useCallback(() => {
    return rateLimitInfo?.resetTime ?? null;
  }, [rateLimitInfo]);

  const isVisitor = useCallback(() => {
    return rateLimitService.isVisitor();
  }, []);

  // Tự động kiểm tra rate limit khi component mount
  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  return {
    rateLimitInfo,
    isChecking,
    canSendMessage: canSendMessage(),
    remainingCount: getRemainingCount(),
    resetTime: getResetTime(),
    isVisitor: isVisitor(),
    checkRateLimit,
    refreshRateLimit,
  };
};