import { useState, useEffect } from 'react';
import { captchaApi, CaptchaData } from '../lib/api';
import { RefreshCw, Loader2, ShieldQuestion } from 'lucide-react';

interface Props {
  onVerify: (captchaId: string, answer: string) => void;
  error?: string;
}

export default function CaptchaInput({ onVerify, error }: Props) {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCaptcha = async () => {
    setLoading(true);
    try {
      const res = await captchaApi.get();
      setCaptcha(res.data);
      setAnswer('');
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadCaptcha(); }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium font-body text-campus-text-secondary">验证码</label>
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <ShieldQuestion className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-campus-text-tertiary" />
          <input type="text" value={answer} onChange={e => { setAnswer(e.target.value); onVerify(captcha?.captchaId || '', e.target.value); }}
            placeholder="输入验证码" maxLength={6}
            className={`w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-hover border ${error ? 'border-red-500' : 'border-border'} text-sm font-body focus:outline-none focus:border-primary`} />
        </div>
        <div className="w-24 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-sm font-mono select-none" onClick={loadCaptcha}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : captcha?.imageBase64 ? <img src={captcha.imageBase64} className="h-8" alt="captcha" /> : captcha?.question || 'ABC'}
        </div>
        <button onClick={loadCaptcha} className="p-2 hover:bg-surface-hover rounded-lg transition-colors" title="刷新验证码">
          <RefreshCw className="w-4 h-4 text-campus-text-tertiary" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-body">{error}</p>}
      <p className="text-xs text-campus-text-tertiary font-body">点击验证码图片可刷新</p>
    </div>
  );
}
