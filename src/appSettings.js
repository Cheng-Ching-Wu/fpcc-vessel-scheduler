/**
 * 應用程式全局設定
 * 定義 Gantt 圖表的可配置參數
 */

export const DEFAULT_SETTINGS = {
    // 時間間隔設定（小時）
    timeIntervalHours: 6,

    // 每台船的子項目及顏色
    vessels: [
        {
            name: '油駁船1',
            prefix: 's1',
            activities: [
                { key: 'bunkering', label: '補油', color: '#009bff4d', border: '#009bff' },
                { key: 'transfer', label: '駁油', color: '#b247ff4d', border: '#b247ff' },
                { key: 'maintenance', label: '維修', color: '#e68c004d', border: '#e68c00' },
                { key: 'breakdown', label: '故障', color: '#b900124d', border: '#b90012' },
                { key: 'other', label: '其他', color: '#c0c0c04d', border: '#b0b0b0' },
            ]
        },
        {
            name: '油駁船2',
            prefix: 's2',
            activities: [
                { key: 'bunkering', label: '補油', color: '#009bff4d', border: '#009bff' },
                { key: 'transfer', label: '駁油', color: '#b247ff4d', border: '#b247ff' },
                { key: 'maintenance', label: '維修', color: '#e68c004d', border: '#e68c00' },
                { key: 'breakdown', label: '故障', color: '#b900124d', border: '#b90012' },
                { key: 'other', label: '其他', color: '#c0c0c04d', border: '#b0b0b0' },
            ]
        },
        {
            name: '工作船3',
            prefix: 's3',
            activities: [
                { key: 'transport', label: '載運', color: '#00aab44d', border: '#00aab4' },
                { key: 'patrol', label: '警戒', color: '#ff001a4d', border: '#ff001a' },
                { key: 'maintenance', label: '維修', color: '#e68c004d', border: '#e68c00' },
                { key: 'breakdown', label: '故障', color: '#b900124d', border: '#b90012' },
                { key: 'other', label: '其他', color: '#c0c0c04d', border: '#b0b0b0' },
            ]
        }
    ]
}

// 創建反應式配置（支持動態更新）
let currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))

export function getSettings() {
    return currentSettings
}

export function updateSettings(newSettings) {
    currentSettings = JSON.parse(JSON.stringify(newSettings))
    // 可選：保存到 localStorage
    localStorage.setItem('planGanttSettings', JSON.stringify(currentSettings))
}

export function resetSettings() {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    localStorage.removeItem('planGanttSettings')
}

// 應用程式啟動時從 localStorage 載入已保存的設定
export function initializeSettings() {
    const saved = localStorage.getItem('planGanttSettings')
    if (saved) {
        try {
            currentSettings = JSON.parse(saved)
        } catch (e) {
            console.warn('Failed to load saved settings, using defaults:', e)
            currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
        }
    }
}

// 取得所有活動顏色對應（用於 TYPE_COLORS）
export function getActivityColors() {
    const colors = {}
    DEFAULT_SETTINGS.vessels.forEach(vessel => {
        vessel.activities.forEach(activity => {
            colors[activity.key] = {
                color: activity.color,
                border: activity.border
            }
        })
    })
    return colors
}
