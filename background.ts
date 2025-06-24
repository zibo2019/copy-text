// AI Text Extractor - Background Script
// 处理扩展的后台逻辑、消息传递和数据存储

interface ExtractorStats {
  totalCopies: number;
  lastCopyTime: string | null;
  dailyUsage: { [date: string]: number };
}

class BackgroundService {
  private stats: ExtractorStats = {
    totalCopies: 0,
    lastCopyTime: null,
    dailyUsage: {}
  };

  constructor() {
    this.init();
  }

  private async init() {
    // 加载统计数据
    await this.loadStats();
    
    // 设置消息监听器
    this.setupMessageListeners();
    
    // 设置上下文菜单
    this.setupContextMenus();
    
    // 设置快捷键
    this.setupCommands();
  }

  private async loadStats() {
    try {
      const result = await chrome.storage.local.get(['aiTextExtractorStats']);
      if (result.aiTextExtractorStats) {
        this.stats = result.aiTextExtractorStats;
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }

  private async saveStats() {
    try {
      await chrome.storage.local.set({ aiTextExtractorStats: this.stats });
    } catch (error) {
      console.error('保存统计数据失败:', error);
    }
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.action) {
        case 'copy-success':
          await this.recordCopyAction(message.textLength);
          sendResponse({ success: true });
          break;
          
        case 'get-settings':
          const settings = await this.getSettings();
          sendResponse({ settings });
          break;
          
        default:
          sendResponse({ error: '未知操作' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  }

  private async recordCopyAction(textLength: number) {
    this.stats.totalCopies++;
    this.stats.lastCopyTime = new Date().toISOString();
    
    // 记录每日使用量
    const today = new Date().toISOString().split('T')[0];
    this.stats.dailyUsage[today] = (this.stats.dailyUsage[today] || 0) + 1;
    
    // 清理旧的每日数据（保留30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    Object.keys(this.stats.dailyUsage).forEach(date => {
      if (date < cutoffDate) {
        delete this.stats.dailyUsage[date];
      }
    });
    
    await this.saveStats();
  }

  private async getSettings() {
    try {
      const result = await chrome.storage.sync.get(['aiTextExtractorSettings']);
      return result.aiTextExtractorSettings || {
        maxLength: 50000,
        cleanFormatting: true,
        showNotifications: true,
        autoHideButton: false
      };
    } catch (error) {
      console.error('获取设置失败:', error);
      return null;
    }
  }



  private setupContextMenus() {
    // 创建右键菜单
    chrome.contextMenus.create({
      id: 'ai-text-extractor-copy-all',
      title: '复制全页面文本 (AI优化)',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'ai-text-extractor-copy-selection',
      title: '选择元素提取文本 (AI优化)',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'ai-text-extractor-copy-main',
      title: '智能提取主要内容',
      contexts: ['page']
    });

    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (!tab?.id) return;

      try {
        let action = '';
        switch (info.menuItemId) {
          case 'ai-text-extractor-copy-all':
            action = 'copy-all';
            break;
          case 'ai-text-extractor-copy-selection':
            action = 'copy-selection';
            break;
          case 'ai-text-extractor-copy-main':
            action = 'copy-main';
            break;
        }

        if (action) {
          await chrome.tabs.sendMessage(tab.id, { action });
        }
      } catch (error) {
        console.error('右键菜单操作失败:', error);
      }
    });
  }

  private setupCommands() {
    chrome.commands.onCommand.addListener(async (command) => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        let action = '';
        switch (command) {
          case 'copy-all':
            action = 'copy-all';
            break;
          case 'copy-selection':
            action = 'copy-selection';
            break;
          case 'copy-main':
            action = 'copy-main';
            break;
        }

        if (action) {
          await chrome.tabs.sendMessage(tab.id, { action });
        }
      } catch (error) {
        console.error('快捷键操作失败:', error);
      }
    });
  }
}

// 初始化后台服务
new BackgroundService();

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装时显示欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// 扩展启动时的处理
chrome.runtime.onStartup.addListener(() => {
  console.log('AI Text Extractor 已启动');
});
