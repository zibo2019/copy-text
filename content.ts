// AI Text Extractor - Content Script
// 专为AI内容喂养优化的智能文本提取器

interface TextExtractionOptions {
  includeLinks?: boolean;
  maxLength?: number;
  cleanFormatting?: boolean;
  preserveStructure?: boolean;
}

class AITextExtractor {
  private floatingButton: HTMLElement | null = null;
  private isButtonVisible = false;
  private settings: TextExtractionOptions = {
    maxLength: 50000,
    cleanFormatting: true,
    includeLinks: false,
    preserveStructure: false
  };

  constructor() {
    this.init();
  }

  private async init() {
    // 加载设置
    await this.loadSettings();

    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupExtractor());
    } else {
      this.setupExtractor();
    }

    // 监听来自后台脚本的消息
    this.setupMessageListener();
  }

  private async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'get-settings' });
      if (response?.settings) {
        this.settings = { ...this.settings, ...response.settings };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'copy-all':
          this.handleAction('copy-all');
          break;
        case 'copy-selection':
          this.handleAction('copy-selection');
          break;
        case 'copy-main':
          this.handleAction('copy-main');
          break;
        case 'test-extraction':
          this.testExtraction();
          break;
      }
      sendResponse({ success: true });
    });
  }

  private testExtraction() {
    // 显示测试通知
    this.showNotification('测试提取功能正常工作！', 'success');
  }

  private setupExtractor() {
    this.createFloatingButton();
    this.setupEventListeners();
  }

  // 创建悬浮按钮
  private createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'ai-text-extractor-button';
    button.innerHTML = `
      <div class="ate-main-button" title="AI文本提取器">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9V7h9v14z"/>
        </svg>
      </div>
      <div class="ate-menu" style="display: none;">
        <button class="ate-menu-item" data-action="copy-all">
          <span>复制全页</span>
        </button>
        <button class="ate-menu-item" data-action="copy-selection">
          <span>复制选中</span>
        </button>
        <button class="ate-menu-item" data-action="copy-main">
          <span>智能提取</span>
        </button>
      </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #ai-text-extractor-button {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .ate-main-button {
        width: 48px;
        height: 48px;
        background: #4F46E5;
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        transition: all 0.2s ease;
      }
      
      .ate-main-button:hover {
        background: #4338CA;
        transform: scale(1.05);
      }
      
      .ate-menu {
        position: absolute;
        top: 56px;
        right: 0;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border: 1px solid #E5E7EB;
        min-width: 140px;
        overflow: hidden;
      }
      
      .ate-menu-item {
        display: block;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: #374151;
        transition: background-color 0.15s ease;
      }
      
      .ate-menu-item:hover {
        background: #F3F4F6;
      }
      
      .ate-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10001;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(button);
    this.floatingButton = button;
  }

  // 设置事件监听器
  private setupEventListeners() {
    if (!this.floatingButton) return;

    const mainButton = this.floatingButton.querySelector('.ate-main-button');
    const menu = this.floatingButton.querySelector('.ate-menu') as HTMLElement;

    // 主按钮点击事件
    mainButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // 菜单项点击事件
    this.floatingButton.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const menuItem = target.closest('.ate-menu-item') as HTMLElement;
      
      if (menuItem) {
        const action = menuItem.dataset.action;
        this.handleAction(action);
        this.hideMenu();
      }
    });

    // 点击其他地方隐藏菜单
    document.addEventListener('click', () => {
      this.hideMenu();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.handleAction('copy-all');
      }
    });
  }

  private toggleMenu() {
    const menu = this.floatingButton?.querySelector('.ate-menu') as HTMLElement;
    if (menu) {
      const isVisible = menu.style.display !== 'none';
      menu.style.display = isVisible ? 'none' : 'block';
      this.isButtonVisible = !isVisible;
    }
  }

  private hideMenu() {
    const menu = this.floatingButton?.querySelector('.ate-menu') as HTMLElement;
    if (menu) {
      menu.style.display = 'none';
      this.isButtonVisible = false;
    }
  }

  // 处理用户操作
  private async handleAction(action: string | undefined) {
    let text = '';
    let successMessage = '';

    try {
      switch (action) {
        case 'copy-all':
          text = this.processTextForAI(this.extractFullPageText());
          successMessage = '已复制全页面文本 (AI优化)';
          break;
        case 'copy-selection':
          const selectedText = this.extractSelectedText();
          text = selectedText ? this.processTextForAI(selectedText) : '';
          successMessage = text ? '已复制选中文本 (AI优化)' : '请先选中文本';
          break;
        case 'copy-main':
          text = this.processTextForAI(this.extractMainContent());
          successMessage = '已复制主要内容 (AI优化)';
          break;
        default:
          return;
      }

      if (text) {
        await this.copyToClipboard(text);
        this.showNotification(successMessage);

        // 向后台脚本报告复制成功
        try {
          await chrome.runtime.sendMessage({
            action: 'copy-success',
            textLength: text.length
          });
        } catch (error) {
          console.error('报告复制状态失败:', error);
        }
      } else if (action === 'copy-selection') {
        this.showNotification('请先选中要复制的文本', 'warning');
      }
    } catch (error) {
      console.error('复制失败:', error);
      this.showNotification('复制失败，请重试', 'error');
    }
  }

  // 提取全页面文本
  private extractFullPageText(options: TextExtractionOptions = {}): string {
    const {
      maxLength = 50000,
      cleanFormatting = true,
      preserveStructure = false
    } = options;

    // 移除不需要的元素
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.advertisement', '.ads', '.sidebar', '.menu',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];

    const clone = document.cloneNode(true) as Document;
    elementsToRemove.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    let text = clone.body?.innerText || '';
    
    if (cleanFormatting) {
      text = this.cleanText(text);
    }

    return this.truncateText(text, maxLength);
  }

  // 提取选中文本
  private extractSelectedText(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return '';
    }

    let text = selection.toString();
    return this.cleanText(text);
  }

  // 智能提取主要内容
  private extractMainContent(): string {
    // 尝试找到主要内容区域
    const mainSelectors = [
      'main', 'article', '.content', '.post', '.entry',
      '[role="main"]', '.main-content', '#content'
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let text = element.textContent || '';
        return this.cleanText(text);
      }
    }

    // 如果没找到主要内容区域，使用全页面提取
    return this.extractFullPageText({ maxLength: 30000 });
  }

  // 清理文本格式 - AI优化版本
  private cleanText(text: string): string {
    if (!this.settings.cleanFormatting) {
      return text.trim();
    }

    return text
      // 移除多余的空白字符
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // 移除行首行尾空白
      .replace(/^\s+|\s+$/gm, '')
      // 移除特殊字符和控制字符
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // 标准化引号
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // 移除多余的标点符号
      .replace(/([.!?])\1+/g, '$1')
      // 确保段落间有适当的分隔
      .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2')
      .trim();
  }

  // AI友好的文本处理
  private processTextForAI(text: string): string {
    // 基础清理
    text = this.cleanText(text);

    // 添加文本统计信息
    const stats = this.getTextStats(text);
    let processedText = text;

    // 如果文本过长，进行智能截断
    if (text.length > this.settings.maxLength!) {
      processedText = this.intelligentTruncate(text, this.settings.maxLength!);
    }

    // 添加元信息头部
    const metadata = this.generateMetadata(stats, processedText.length !== text.length);

    return metadata + '\n\n' + processedText;
  }

  // 获取文本统计信息
  private getTextStats(text: string) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
      characters: text.length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      estimatedTokens: Math.ceil(words.length * 1.3) // 粗略估算token数
    };
  }

  // 生成元信息
  private generateMetadata(stats: any, wasTruncated: boolean): string {
    const url = window.location.href;
    const title = document.title;
    const timestamp = new Date().toISOString();

    let metadata = `[AI文本提取 - ${title}]`;
    metadata += `\n来源: ${url}`;
    metadata += `\n提取时间: ${timestamp}`;
    metadata += `\n统计: ${stats.characters}字符, ${stats.words}词, ${stats.sentences}句, ${stats.paragraphs}段`;
    metadata += `\n预估Token: ~${stats.estimatedTokens}`;

    if (wasTruncated) {
      metadata += `\n⚠️ 文本已截断至${this.settings.maxLength}字符以适应AI输入限制`;
    }

    metadata += '\n' + '='.repeat(50);

    return metadata;
  }

  // 智能截断文本
  private intelligentTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // 预留空间给截断提示
    const reserveSpace = 200;
    const targetLength = maxLength - reserveSpace;

    // 尝试在句子边界截断
    const sentences = text.split(/([.!?]+\s*)/);
    let result = '';

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      if ((result + sentence).length > targetLength) {
        break;
      }
      result += sentence;
    }

    // 如果句子截断后太短，尝试段落截断
    if (result.length < targetLength * 0.7) {
      const paragraphs = text.split(/\n\s*\n/);
      result = '';

      for (const paragraph of paragraphs) {
        if ((result + paragraph + '\n\n').length > targetLength) {
          break;
        }
        result += paragraph + '\n\n';
      }
    }

    // 如果还是太短，直接字符截断
    if (result.length < targetLength * 0.5) {
      result = text.substring(0, targetLength);
      // 尝试在单词边界截断
      const lastSpace = result.lastIndexOf(' ');
      if (lastSpace > targetLength * 0.8) {
        result = result.substring(0, lastSpace);
      }
    }

    // 添加截断提示
    const truncatedLength = text.length - result.length;
    result += `\n\n[已截断 ${truncatedLength} 字符]`;
    result += `\n[原文总长度: ${text.length} 字符]`;
    result += `\n[建议: 如需完整内容，请分段提取或调整最大长度设置]`;

    return result.trim();
  }

  // 截断文本
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // 在句号或段落处截断
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('。');
    const lastParagraph = truncated.lastIndexOf('\n\n');
    
    const cutPoint = Math.max(lastSentence, lastParagraph);
    if (cutPoint > maxLength * 0.8) {
      return truncated.substring(0, cutPoint + 1) + '\n\n[文本已截断，总长度超出限制]';
    }

    return truncated + '...\n\n[文本已截断，总长度超出限制]';
  }

  // 复制到剪贴板
  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // 显示通知
  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.className = 'ate-notification';
    notification.textContent = message;
    
    if (type === 'warning') {
      notification.style.background = '#F59E0B';
    } else if (type === 'error') {
      notification.style.background = '#EF4444';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// 初始化扩展
new AITextExtractor();
