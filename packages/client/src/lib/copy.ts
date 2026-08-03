import copyToClipboard from 'copy-to-clipboard';
import { toastStore } from '../App';

/** 复制到剪贴板，附带 toast 反馈 */
export async function copy(text: string, label = '已复制到剪贴板'): Promise<boolean> {
  const ok = await copyToClipboard(text);
  if (ok) {
    toastStore.add(label, 'success');
  } else {
    toastStore.add('复制失败，请手动复制', 'error');
  }
  return ok;
}