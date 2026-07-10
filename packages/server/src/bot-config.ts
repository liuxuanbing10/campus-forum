// ponytail: static UA pattern lists, move to env/config if they need runtime changes
export const BOT_UA_PATTERNS = [
  'python-requests', 'python-httpx', 'aiohttp',
  'curl/', 'wget/', 'libcurl',
  'scrapy', 'nutch', 'go-http-client',
  'okhttp', 'apache-httpclient', 'java/',
  'axios/', 'node-fetch', 'urllib',
  'php/', 'perl/',
  'ruby/', 'nethttp',
  'httpx/', 'http-client',
  'selenium', 'playwright', 'puppeteer',
  'httpie', 'fetch-some-requests',
  'fasthttp', 'restsharp', 'restclient',
];

export const SUSPICIOUS_UA_PATTERNS = [
  'bot', 'crawler', 'spider', 'scraper', 'scrape',
  'dataforseo', 'ahrefsbot', 'semrush', 'majestic',
  'zgrab', 'masscan', 'nmap',
];

export function isSuspiciousUA(ua: string | undefined): boolean {
  if (!ua) return true;
  const lowered = ua.toLowerCase();
  if (BOT_UA_PATTERNS.some(p => lowered.includes(p))) return true;
  if (SUSPICIOUS_UA_PATTERNS.some(p => lowered.includes(p))) {
    if (lowered.includes('mozilla') && lowered.includes('applewebkit')) return false;
    return true;
  }
  if (ua.length < 10) return true;
  return false;
}
