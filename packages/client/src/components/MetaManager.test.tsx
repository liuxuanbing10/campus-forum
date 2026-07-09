import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import MetaManager from './MetaManager';

describe('MetaManager', () => {
  const renderWithProvider = (component: React.ReactNode) => {
    return render(<HelmetProvider>{component}</HelmetProvider>);
  };

  it('renders default meta tags', () => {
    renderWithProvider(<MetaManager />);
    
    expect(document.title).toBe('校园论坛');
    expect(document.querySelector('meta[name="description"]')?.content).toBe(
      '校园交流论坛 - 分享知识，连接校园'
    );
    expect(document.querySelector('meta[name="keywords"]')?.content).toBe(
      '校园论坛,社区,交流,校园生活,学习'
    );
  });

  it('renders custom title and description', () => {
    renderWithProvider(
      <MetaManager
        title="测试页面"
        description="测试描述"
        keywords="测试,关键词"
      />
    );
    
    expect(document.title).toBe('测试页面 - 校园论坛');
    expect(document.querySelector('meta[name="description"]')?.content).toBe('测试描述');
    expect(document.querySelector('meta[name="keywords"]')?.content).toBe('测试,关键词');
  });

  it('renders Open Graph meta tags', () => {
    renderWithProvider(
      <MetaManager
        title="文章标题"
        ogType="article"
        ogImage="https://example.com/image.jpg"
      />
    );
    
    expect(document.querySelector('meta[property="og:title"]')?.content).toBe('文章标题 - 校园论坛');
    expect(document.querySelector('meta[property="og:type"]')?.content).toBe('article');
    expect(document.querySelector('meta[property="og:image"]')?.content).toBe('https://example.com/image.jpg');
  });

  it('renders Twitter Card meta tags', () => {
    renderWithProvider(
      <MetaManager
        title="推文标题"
        twitterCard="summary_large_image"
        twitterImage="https://example.com/twitter.jpg"
      />
    );
    
    expect(document.querySelector('meta[name="twitter:card"]')?.content).toBe('summary_large_image');
    expect(document.querySelector('meta[name="twitter:title"]')?.content).toBe('推文标题 - 校园论坛');
    expect(document.querySelector('meta[name="twitter:image"]')?.content).toBe('https://example.com/twitter.jpg');
  });

  it('renders canonical link', () => {
    renderWithProvider(<MetaManager canonical="https://example.com/page" />);
    
    expect(document.querySelector('link[rel="canonical"]')?.href).toBe('https://example.com/page');
  });
});
