import { useRef, useState, useEffect, useCallback } from 'react';

interface UseSmartScrollOptions {
    threshold?: number;
    dependencies?: any[];
}

export const useSmartScroll = (options: UseSmartScrollOptions = {}) => {
    const { threshold = 100, dependencies = [] } = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Check if user is near the bottom of the container
    const isNearBottom = useCallback(() => {
        const container = containerRef.current;
        if (!container) return true;

        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < threshold;
    }, [threshold]);

    // Handle scroll events to determine if we should auto-scroll
    const handleScroll = useCallback(() => {
        setShouldAutoScroll(isNearBottom());
    }, [isNearBottom]);

    // Auto-scroll to bottom if needed
    const scrollToBottom = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, []);

    // Auto-scroll when dependencies change
    useEffect(() => {
        scrollToBottom();
    }, dependencies);

    return {
        containerRef,
        shouldAutoScroll,
        handleScroll,
        scrollToBottom,
        isNearBottom
    };
};
