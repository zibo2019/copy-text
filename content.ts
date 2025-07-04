// Smart Text Extractor - Content Script
// 智能文本提取器

interface TextExtractionOptions {
  includeLinks?: boolean;
  cleanFormatting?: boolean;
  preserveStructure?: boolean;
  autoHideButton?: boolean;
  completelyHideButton?: boolean;
}

interface LastSelection {
  domain: string;
  selector: string;
  timestamp: number;
  elementInfo: string;
}

class SmartTextExtractor {
  private floatingButton: HTMLElement | null = null;
  private isButtonVisible = true;
  private isInspectMode = false;
  private inspectOverlay: HTMLElement | null = null;
  private highlightedElement: HTMLElement | null = null;
  private autoHideTimer: number | null = null;
  private isMouseOverButton = false;
  private lastSelection: LastSelection | null = null;
  private settings: TextExtractionOptions = {
    cleanFormatting: true,
    includeLinks: false,
    preserveStructure: false,
    autoHideButton: false,
    completelyHideButton: false
  };

  constructor() {
    this.init();
  }

  private async init() {
    // 加载设置
    await this.loadSettings();

    // 加载上次选择的数据
    await this.loadLastSelection();

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
        // 如果按钮已经创建，重新应用自动隐藏设置
        if (this.floatingButton) {
          this.applyAutoHideSettings();
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  private async loadLastSelection() {
    try {
      const result = await chrome.storage.local.get(['smartTextExtractorLastSelection']);
      if (result.smartTextExtractorLastSelection) {
        this.lastSelection = result.smartTextExtractorLastSelection;
      }
    } catch (error) {
      console.error('加载上次选择失败:', error);
    }
  }

  private async saveLastSelection(element: HTMLElement) {
    try {
      const selector = this.generateSelector(element);
      const elementInfo = this.getElementInfo(element);

      this.lastSelection = {
        domain: window.location.hostname,
        selector: selector,
        timestamp: Date.now(),
        elementInfo: elementInfo
      };

      await chrome.storage.local.set({
        smartTextExtractorLastSelection: this.lastSelection
      });
    } catch (error) {
      console.error('保存上次选择失败:', error);
    }
  }



  // 生成CSS选择器
  private generateSelector(element: HTMLElement): string {
    // 如果有唯一ID，先检查是否真的唯一
    if (element.id) {
      const elementsWithSameId = document.querySelectorAll(`#${element.id}`);
      if (elementsWithSameId.length === 1) {
        return `#${element.id}`;
      }
    }

    // 构建完整的路径选择器
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      let isUnique = false;

      // 1. 尝试使用ID（如果存在且在当前上下文中唯一）
      if (current.id) {
        const testSelector = `${selector}#${current.id}`;
        if (current.parentElement) {
          const siblings = current.parentElement.querySelectorAll(testSelector);
          if (siblings.length === 1) {
            selector = testSelector;
            isUnique = true;
          }
        }
      }

      // 2. 如果ID不唯一，尝试使用类名组合
      if (!isUnique && current.className) {
        const classes = current.className.split(' ').filter(cls =>
          cls && !cls.startsWith('_') && cls.length > 1 &&
          !cls.includes('active') && !cls.includes('hover') &&
          !cls.includes('focus') && !cls.includes('selected')
        );

        if (classes.length > 0) {
          // 尝试使用所有有意义的类名
          const classSelector = classes.slice(0, 3).join('.');
          const testSelector = `${selector}.${classSelector}`;

          if (current.parentElement) {
            const siblings = current.parentElement.querySelectorAll(testSelector);
            if (siblings.length === 1) {
              selector = testSelector;
              isUnique = true;
            } else if (classes.length > 0) {
              // 如果多个类名不唯一，至少使用第一个类名
              selector += `.${classes[0]}`;
            }
          }
        }
      }

      // 3. 如果仍不唯一，使用nth-child或nth-of-type
      if (!isUnique && current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const sameTagSiblings = siblings.filter(child => child.tagName === current!.tagName);

        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;

          // 如果同类型标签只有一个，使用标签名就够了
          if (sameTagSiblings.length === 1) {
            // selector 保持不变，已经足够唯一
          } else {
            // 使用nth-child来精确定位
            selector += `:nth-child(${index})`;
          }
        }
      }

      // 4. 添加特殊属性来增强唯一性
      if (!isUnique && current instanceof HTMLElement) {
        const uniqueAttrs = ['data-id', 'data-testid', 'data-cy', 'role', 'aria-label'];
        for (const attr of uniqueAttrs) {
          const value = current.getAttribute(attr);
          if (value) {
            const testSelector = `${selector}[${attr}="${value}"]`;
            if (current.parentElement) {
              const siblings = current.parentElement.querySelectorAll(testSelector);
              if (siblings.length === 1) {
                selector = testSelector;
                break;
              }
            }
          }
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    const finalSelector = path.join(' > ');

    // 验证生成的选择器是否唯一且正确
    try {
      const foundElements = document.querySelectorAll(finalSelector);
      if (foundElements.length === 1 && foundElements[0] === element) {
        return finalSelector;
      } else {
        // 如果选择器不唯一，添加更多上下文
        return this.generateFallbackSelector(element);
      }
    } catch (error) {
      // 如果选择器语法错误，使用备用方案
      return this.generateFallbackSelector(element);
    }
  }

  // 备用选择器生成方案
  private generateFallbackSelector(element: HTMLElement): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement) {
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current) + 1;
        path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      } else {
        path.unshift(current.tagName.toLowerCase());
      }
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // 生成菜单项
  private generateMenuItems(): string {
    let menuItems = `
      <button class="ate-menu-item" data-action="copy-all">
        <span>复制全页</span>
      </button>
      <button class="ate-menu-item" data-action="copy-selection">
        <span>选择元素</span>
      </button>
    `;

    // 检查是否有上次选择且域名匹配
    if (this.shouldShowLastSelection()) {
      const timeAgo = this.getTimeAgo(this.lastSelection!.timestamp);

      menuItems += `
        <button class="ate-menu-item" data-action="copy-last-selection">
          <span>上次选择 (${this.lastSelection!.elementInfo})</span>
          <small style="display: block; color: #6B7280; font-size: 11px; margin-top: 2px;">${timeAgo}</small>
        </button>
      `;
    }

    return menuItems;
  }

  // 检查是否应该显示上次选择菜单
  private shouldShowLastSelection(): boolean {
    if (!this.lastSelection) return false;

    const currentDomain = window.location.hostname;
    const isMatchingDomain = this.lastSelection.domain === currentDomain;

    // 检查选择是否过期（7天）
    const isNotExpired = (Date.now() - this.lastSelection.timestamp) < (7 * 24 * 60 * 60 * 1000);

    return isMatchingDomain && isNotExpired;
  }

  // 获取时间差描述
  private getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return '一周前';
  }

  // 从上次选择的元素提取文本
  private async extractFromLastSelection() {
    if (!this.lastSelection) {
      this.showNotification('没有找到上次选择的记录', 'warning');
      return;
    }

    try {
      // 尝试使用选择器找到元素
      const elements = document.querySelectorAll(this.lastSelection.selector);

      if (elements.length === 0) {
        this.showNotification(`未找到元素：${this.lastSelection.elementInfo}，页面结构可能已改变`, 'error');
        return;
      }

      if (elements.length > 1) {
        this.showNotification(`找到多个匹配元素(${elements.length}个)，将使用第一个`, 'warning');
      }

      const element = elements[0] as HTMLElement;

      // 验证元素是否可见和有效
      if (!this.isElementVisible(element)) {
        this.showNotification(`元素 ${this.lastSelection.elementInfo} 当前不可见`, 'warning');
        // 仍然尝试提取文本，因为可能是隐藏但有内容的元素
      }



      // 提取文本
      const clone = element.cloneNode(true) as HTMLElement;

      // 移除不需要的元素
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg',
        '.advertisement', '.ads', '[class*="ad-"]', '[id*="ad-"]',
        '[style*="display: none"]', '[style*="display:none"]',
        '.hidden', '[hidden]'
      ];

      unwantedSelectors.forEach(selector => {
        try {
          clone.querySelectorAll(selector).forEach(el => el.remove());
        } catch (e) {
          // 忽略选择器错误
        }
      });

      let text = this.extractAllTextFromElement(clone);

      if (!text.trim()) {
        this.showNotification('该元素没有可提取的文本内容', 'warning');
        return;
      }

      // 应用文本处理
      text = this.processText(text);

      // 复制到剪贴板
      await this.copyToClipboard(text);

      // 显示成功通知
      this.showNotification(`已复制 ${this.lastSelection.elementInfo} 的文本内容 (${text.length}字符)`);

      // 重新启动自动隐藏计时器
      this.startAutoHideTimer();

      // 向后台脚本报告复制成功
      try {
        await chrome.runtime.sendMessage({
          action: 'copy-success',
          textLength: text.length
        });
      } catch (error) {
        console.error('报告复制状态失败:', error);
      }

    } catch (error) {
      console.error('从上次选择提取文本失败:', error);
      this.showNotification('提取文本失败，请重试', 'error');
    }
  }

  // 检查元素是否可见
  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.action) {
        case 'copy-all':
          this.handleAction('copy-all');
          break;
        case 'copy-selection':
          this.handleAction('copy-selection');
          break;
      }
      sendResponse({ success: true });
    });
  }



  private setupExtractor() {
    this.createFloatingButton();
    this.setupEventListeners();
    this.applyAutoHideSettings();

    // 插件加载完成提示
    console.log('🚀 Smart Text Extractor 已加载完成 - 智能文本提取工具');
  }

  // 创建悬浮按钮
  private createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'smart-text-extractor-button';

    // 动态生成菜单内容
    const menuItems = this.generateMenuItems();

    button.innerHTML = `
      <div class="ate-main-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9V7h9v14z"/>
        </svg>
      </div>
      <div class="ate-menu" style="display: none;">
        ${menuItems}
      </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #smart-text-extractor-button {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: opacity 0.3s ease, transform 0.3s ease;
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

    // 鼠标悬停事件（用于自动隐藏功能）
    this.floatingButton.addEventListener('mouseenter', () => {
      if (this.settings.completelyHideButton) return;
      this.isMouseOverButton = true;
      if (!this.isButtonVisible) {
        this.showButton();
      }
      this.clearAutoHideTimer();
    });

    this.floatingButton.addEventListener('mouseleave', () => {
      if (this.settings.completelyHideButton) return;
      this.isMouseOverButton = false;
      this.startAutoHideTimer();
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
      if (isVisible) {
        menu.style.display = 'none';
      } else {
        // 重新生成菜单内容以确保"上次选择"选项正确显示
        menu.innerHTML = this.generateMenuItems();
        menu.style.display = 'block';
      }
    }
  }

  private hideMenu() {
    const menu = this.floatingButton?.querySelector('.ate-menu') as HTMLElement;
    if (menu) {
      menu.style.display = 'none';
    }
  }

  // 处理用户操作
  private async handleAction(action: string | undefined) {
    let text = '';
    let successMessage = '';

    try {
      switch (action) {
        case 'copy-all':
          text = this.processText(this.extractFullPageText());
          successMessage = '已复制全页面文本';
          break;
        case 'copy-selection':
          // 进入元素选择模式
          this.enterInspectMode();
          return; // 不执行复制，等待用户选择元素
        case 'copy-last-selection':
          // 使用上次选择的选择器提取文本
          await this.extractFromLastSelection();
          return; // 在extractFromLastSelection中处理复制和通知
        default:
          return;
      }

      if (text) {
        await this.copyToClipboard(text);
        this.showNotification(successMessage);

        // 重新启动自动隐藏计时器
        this.startAutoHideTimer();

        // 向后台脚本报告复制成功
        try {
          await chrome.runtime.sendMessage({
            action: 'copy-success',
            textLength: text.length
          });
        } catch (error) {
          console.error('报告复制状态失败:', error);
        }
      }
    } catch (error) {
      console.error('复制失败:', error);
      this.showNotification('复制失败，请重试', 'error');
    }
  }

  // 提取全页面文本
  private extractFullPageText(options: TextExtractionOptions = {}): string {
    const {
      cleanFormatting = true
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

    return text;
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

  // 文本处理和优化
  private processText(text: string): string {
    // 基础清理
    text = this.cleanText(text);

    // 添加文本统计信息
    const stats = this.getTextStats(text);

    // 添加元信息头部
    const metadata = this.generateMetadata(stats);

    return metadata + '\n\n' + text;
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
      paragraphs: paragraphs.length
    };
  }

  // 生成元信息
  private generateMetadata(stats: any): string {
    const url = window.location.href;
    const title = document.title;
    const timestamp = new Date().toISOString();

    let metadata = `[网页文本提取 - ${title}]`;
    metadata += `\n来源: ${url}`;
    metadata += `\n提取时间: ${timestamp}`;
    metadata += `\n统计: ${stats.characters}字符, ${stats.words}词, ${stats.sentences}句, ${stats.paragraphs}段`;

    metadata += '\n' + '='.repeat(50);

    return metadata;
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

  // 进入元素检查模式
  private enterInspectMode() {
    if (this.isInspectMode) return;

    this.isInspectMode = true;
    this.hideMenu();
    this.createInspectOverlay();
    this.setupInspectEventListeners();
    this.showNotification('检查模式已启动，点击任意元素提取文本，按ESC退出', 'warning');
  }

  // 退出元素检查模式
  private exitInspectMode() {
    if (!this.isInspectMode) return;

    this.isInspectMode = false;
    this.removeInspectOverlay();
    this.removeHighlight();
    this.removeInspectEventListeners();
  }

  // 创建检查模式覆盖层
  private createInspectOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'smart-text-extractor-inspect-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(79, 70, 229, 0.1);
      z-index: 9999;
      cursor: crosshair;
      pointer-events: none;
    `;

    // 添加提示文字
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1F2937;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10001;
    `;
    hint.textContent = '点击任意元素提取文本 • 按ESC退出检查模式';

    document.body.appendChild(overlay);
    document.body.appendChild(hint);

    this.inspectOverlay = overlay;

    // 3秒后自动隐藏提示
    setTimeout(() => {
      if (hint.parentNode) {
        hint.remove();
      }
    }, 3000);
  }

  // 移除检查模式覆盖层
  private removeInspectOverlay() {
    if (this.inspectOverlay) {
      this.inspectOverlay.remove();
      this.inspectOverlay = null;
    }

    // 移除所有提示元素
    document.querySelectorAll('#smart-text-extractor-inspect-overlay, [id*="smart-text-extractor-hint"]').forEach(el => {
      el.remove();
    });
  }

  // 设置检查模式事件监听器
  private setupInspectEventListeners() {
    document.addEventListener('mouseover', this.handleInspectMouseOver);
    document.addEventListener('mouseout', this.handleInspectMouseOut);
    document.addEventListener('click', this.handleInspectClick);
    document.addEventListener('keydown', this.handleInspectKeyDown);
  }

  // 移除检查模式事件监听器
  private removeInspectEventListeners() {
    document.removeEventListener('mouseover', this.handleInspectMouseOver);
    document.removeEventListener('mouseout', this.handleInspectMouseOut);
    document.removeEventListener('click', this.handleInspectClick);
    document.removeEventListener('keydown', this.handleInspectKeyDown);
  }

  // 处理鼠标悬停
  private handleInspectMouseOver = (e: MouseEvent) => {
    if (!this.isInspectMode) return;

    const target = e.target as HTMLElement;
    if (target && target !== this.floatingButton && !this.floatingButton?.contains(target)) {
      this.highlightElement(target);
    }
  };

  // 处理鼠标离开
  private handleInspectMouseOut = (_e: MouseEvent) => {
    if (!this.isInspectMode) return;
    // 不立即移除高亮，等待新的元素高亮
  };

  // 处理点击事件
  private handleInspectClick = async (e: MouseEvent) => {
    if (!this.isInspectMode) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target && target !== this.floatingButton && !this.floatingButton?.contains(target)) {
      await this.extractElementText(target);
      this.exitInspectMode();
    }
  };

  // 处理键盘事件
  private handleInspectKeyDown = (e: KeyboardEvent) => {
    if (!this.isInspectMode) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.exitInspectMode();
      this.showNotification('已退出检查模式');
    }
  };

  // 高亮元素
  private highlightElement(element: HTMLElement) {
    this.removeHighlight();

    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'smart-text-extractor-highlight';
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #4F46E5;
      background: rgba(79, 70, 229, 0.1);
      pointer-events: none;
      z-index: 10000;
      border-radius: 4px;
    `;

    // 添加标签显示元素信息
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -30px;
      left: 0;
      background: #4F46E5;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ')[0]}` : '';
    const id = element.id ? `#${element.id}` : '';
    label.textContent = `${tagName}${id}${className}`;

    highlight.appendChild(label);
    document.body.appendChild(highlight);
    this.highlightedElement = highlight;
  }

  // 移除高亮
  private removeHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.remove();
      this.highlightedElement = null;
    }
  }

  // 提取元素文本
  private async extractElementText(element: HTMLElement) {
    try {
      // 深度克隆元素以避免修改原始DOM
      const clone = element.cloneNode(true) as HTMLElement;

      // 移除脚本、样式等不需要的元素，但保留所有文本内容
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg',
        '.advertisement', '.ads', '[class*="ad-"]', '[id*="ad-"]',
        '[style*="display: none"]', '[style*="display:none"]',
        '.hidden', '[hidden]'
      ];

      unwantedSelectors.forEach(selector => {
        try {
          clone.querySelectorAll(selector).forEach(el => el.remove());
        } catch (e) {
          // 忽略选择器错误
        }
      });

      // 使用更全面的文本提取方法
      let text = this.extractAllTextFromElement(clone);

      if (!text.trim()) {
        this.showNotification('该元素没有可提取的文本内容', 'warning');
        return;
      }

      // 应用文本处理
      text = this.processText(text);

      // 复制到剪贴板
      await this.copyToClipboard(text);

      // 保存上次选择
      await this.saveLastSelection(element);

      // 显示成功通知
      const elementInfo = this.getElementInfo(element);
      this.showNotification(`已复制 ${elementInfo} 的文本内容 (${text.length}字符)`);

      // 重新启动自动隐藏计时器
      this.startAutoHideTimer();

      // 向后台脚本报告复制成功
      try {
        await chrome.runtime.sendMessage({
          action: 'copy-success',
          textLength: text.length
        });
      } catch (error) {
        console.error('报告复制状态失败:', error);
      }

    } catch (error) {
      console.error('提取元素文本失败:', error);
      this.showNotification('提取文本失败，请重试', 'error');
    }
  }

  // 从元素中提取所有文本内容
  private extractAllTextFromElement(element: HTMLElement): string {
    // 直接使用 textContent 获取所有文本内容（包括隐藏元素）
    let text = element.textContent || '';

    // 温和的文本清理，保持原有结构
    text = text
      .replace(/[ \t]+/g, ' ')  // 只合并空格和制表符，保留换行
      .replace(/\n[ \t]+/g, '\n')  // 移除换行后的空格和制表符
      .replace(/[ \t]+\n/g, '\n')  // 移除换行前的空格和制表符
      .replace(/\n{3,}/g, '\n\n')  // 最多保留两个连续换行
      .trim();

    return text;
  }



  // 获取元素信息
  private getElementInfo(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();

    if (element.id) {
      return `${tagName}#${element.id}`;
    }

    if (element.className) {
      const firstClass = element.className.split(' ')[0];
      return `${tagName}.${firstClass}`;
    }

    // 尝试通过内容识别元素类型
    if (tagName === 'article' || element.getAttribute('role') === 'article') {
      return '文章内容';
    }

    if (tagName === 'main' || element.getAttribute('role') === 'main') {
      return '主要内容';
    }

    if (tagName === 'section') {
      return '章节内容';
    }

    if (tagName === 'div' && element.textContent && element.textContent.length > 100) {
      return '内容区块';
    }

    return tagName;
  }

  // 应用自动隐藏设置
  private applyAutoHideSettings() {
    if (this.settings.completelyHideButton) {
      this.completelyHideButton();
    } else if (this.settings.autoHideButton) {
      this.startAutoHideTimer();
    } else {
      this.showButton();
    }
  }

  // 显示按钮
  private showButton() {
    if (this.floatingButton) {
      this.floatingButton.style.display = 'block';
      this.floatingButton.style.opacity = '1';
      this.floatingButton.style.transform = 'translateX(0)';
      this.isButtonVisible = true;
    }
  }

  // 隐藏按钮
  private hideButton() {
    if (this.floatingButton && this.settings.autoHideButton && !this.isMouseOverButton && this.isButtonVisible) {
      this.floatingButton.style.opacity = '0.3';
      this.floatingButton.style.transform = 'translateX(20px)';
      this.isButtonVisible = false;
    }
  }

  // 彻底隐藏按钮
  private completelyHideButton() {
    if (this.floatingButton) {
      this.floatingButton.style.display = 'none';
      this.isButtonVisible = false;
      this.clearAutoHideTimer();
    }
  }

  // 开始自动隐藏计时器
  private startAutoHideTimer() {
    if (!this.settings.autoHideButton || this.settings.completelyHideButton || !this.isButtonVisible) return;

    this.clearAutoHideTimer();
    this.autoHideTimer = window.setTimeout(() => {
      this.hideButton();
    }, 3000); // 3秒后自动隐藏
  }

  // 清除自动隐藏计时器
  private clearAutoHideTimer() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }
}

// 初始化扩展
new SmartTextExtractor();
