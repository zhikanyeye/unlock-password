import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * 延迟更新值，直到指定的延迟时间过去且没有新的更新
 * 
 * @param value 要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // 只在防抖后的值变化时执行搜索
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器，在延迟后更新防抖值
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函数：如果值在延迟期间再次改变，取消之前的定时器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
