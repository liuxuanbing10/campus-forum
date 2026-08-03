/** @file Date utilities — dayjs singleton + plugins */
import dayjsInstance from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import 'dayjs/locale/zh-cn';

const dayjs = dayjsInstance;
dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.locale('zh-cn');

export { dayjs };
export type { Dayjs } from 'dayjs';

/**
 * 相对时间格式化
 */
export function formatRelative(date: string | number | Date): string {
  return dayjs(date).fromNow();
}

/**
 * 日历时间格式化
 */
export function formatCalendar(date: string | number | Date): string {
  return dayjs(date).calendar(null, {
    lastDay: '[昨日]',
    sameDay: '[今天]',
    nextDay: '[明天]',
    lastWeek: '[上周]',
    nextWeek: '[下周]',
  });
}

/**
 * YYYY-MM-DD 格式化
 */
export function formatDate(date: string | number | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * YYYY-MM-DD HH:mm 格式化
 */
export function formatDateTime(date: string | number | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}
