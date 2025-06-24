import { useState, useEffect } from "react"

interface Settings {
  cleanFormatting: boolean;
  showNotifications: boolean;
  autoHideButton: boolean;
  completelyHideButton: boolean;
}

function IndexPopup() {
  const [settings, setSettings] = useState<Settings>({
    cleanFormatting: true,
    showNotifications: true,
    autoHideButton: false,
    completelyHideButton: false
  });

  const [stats, setStats] = useState({
    totalCopies: 0,
    lastCopyTime: null as string | null
  });

  useEffect(() => {
    // 加载设置和统计数据
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(['smartTextExtractorSettings']);
      if (result.smartTextExtractorSettings) {
        setSettings(result.smartTextExtractorSettings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const result = await chrome.storage.local.get(['smartTextExtractorStats']);
      if (result.smartTextExtractorStats) {
        setStats(result.smartTextExtractorStats);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await chrome.storage.sync.set({ smartTextExtractorSettings: newSettings });
      setSettings(newSettings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    let newSettings = { ...settings, [key]: value };

    // 处理两个隐藏选项的互斥关系
    if (key === 'completelyHideButton' && value === true) {
      // 选择彻底隐藏时，取消自动隐藏
      newSettings.autoHideButton = false;
    } else if (key === 'autoHideButton' && value === true) {
      // 选择自动隐藏时，取消彻底隐藏
      newSettings.completelyHideButton = false;
    }

    saveSettings(newSettings);
  };

  const copyFullPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'copy-all' });
        // 关闭popup窗口
        window.close();
      }
    } catch (error) {
      console.error('复制全页失败:', error);
    }
  };

  const toggleEditMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (document.body.contentEditable === "true") {
              document.body.contentEditable = 'false';
            } else {
              document.body.contentEditable = "true";
            }
          }
        });
        // 关闭popup窗口
        window.close();
      }
    } catch (error) {
      console.error('切换编辑模式失败:', error);
    }
  };

  return (
    <div style={{
      width: 320,
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      lineHeight: 1.5
    }}>
      {/* 头部 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: '#4F46E5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9V7h9v14z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Smart Text Extractor
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
              智能文本提取工具
            </p>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
          快速操作
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyFullPage}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            复制全页
          </button>
          <button
            onClick={toggleEditMode}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            编辑模式
          </button>
        </div>
      </div>

      {/* 使用统计 */}
      {stats.totalCopies > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            使用统计
          </h3>
          <div style={{
            background: '#F9FAFB',
            padding: 12,
            borderRadius: 6,
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#6B7280', fontSize: 12 }}>总复制次数</span>
              <span style={{ color: '#111827', fontSize: 12, fontWeight: 500 }}>{stats.totalCopies}</span>
            </div>
            {stats.lastCopyTime && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280', fontSize: 12 }}>最后使用</span>
                <span style={{ color: '#111827', fontSize: 12, fontWeight: 500 }}>
                  {new Date(stats.lastCopyTime).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 设置选项 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
          设置选项
        </h3>



        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: 12,
            color: '#374151'
          }}>
            <input
              type="checkbox"
              checked={settings.cleanFormatting}
              onChange={(e) => handleSettingChange('cleanFormatting', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            自动清理格式
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: 12,
            color: '#374151'
          }}>
            <input
              type="checkbox"
              checked={settings.showNotifications}
              onChange={(e) => handleSettingChange('showNotifications', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            显示操作通知
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: 12,
            color: '#374151'
          }}>
            <input
              type="checkbox"
              checked={settings.autoHideButton}
              onChange={(e) => handleSettingChange('autoHideButton', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            自动隐藏悬浮按钮
          </label>
        </div>

        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: 12,
            color: '#374151'
          }}>
            <input
              type="checkbox"
              checked={settings.completelyHideButton}
              onChange={(e) => handleSettingChange('completelyHideButton', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            彻底隐藏悬浮按钮
          </label>
        </div>
      </div>

      {/* 使用提示 */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #DBEAFE',
        borderRadius: 6,
        padding: 12
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>
          💡 使用提示
        </h4>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#1E40AF', lineHeight: 1.4 }}>
          <li>点击页面右上角的悬浮按钮开始使用</li>
          <li>支持快捷键 Ctrl+Shift+C 快速复制全页</li>
          <li>点击"编辑模式"可切换页面可编辑状态</li>
          <li>彻底隐藏按钮后可通过快捷键或右键菜单使用</li>
          <li>智能过滤广告、导航等无关内容</li>
          <li>所有处理完全在本地进行，保护隐私</li>
        </ul>
      </div>
    </div>
  )
}

export default IndexPopup
