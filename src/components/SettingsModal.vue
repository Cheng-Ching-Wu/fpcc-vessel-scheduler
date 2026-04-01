<template>
    <transition name="modal-fade">
        <div v-if="visible" class="modal-overlay" @click.self="closeModal">
            <div class="modal-dialog settings-dialog">
                <div class="modal-header">
                    <span>甘特圖設定</span>
                    <button class="modal-close" @click="closeModal">✕</button>
                </div>
                <div class="modal-body settings-body">
                    <!-- 時間間隔設定 -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">時間間隔設定</h3>
                        <div class="form-row">
                            <label>時間間隔（小時）</label>
                            <select v-model.number="formData.timeIntervalHours" class="time-interval-select">
                                <option :value="1">1 小時</option>
                                <option :value="2">2 小時</option>
                                <option :value="3">3 小時</option>
                                <option :value="4">4 小時</option>
                                <option :value="6">6 小時</option>
                                <option :value="8">8 小時</option>
                                <option :value="12">12 小時</option>
                                <option :value="24">24 小時</option>
                            </select>
                            <span class="time-interval-hint">（當前設定：{{ formData.timeIntervalHours }} 小時/格）</span>
                        </div>
                    </div>

                    <!-- 船隻與子項目設定 -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">船隻子項目設定</h3>
                        <div v-for="(vessel, vesselIdx) in formData.vessels" :key="vessel.prefix" class="vessel-settings-block">
                            <div class="vessel-header">
                                <input 
                                    v-model="vessel.name" 
                                    type="text"
                                    class="vessel-name-input"
                                    :placeholder="`船隻 ${vesselIdx + 1} 名稱`"
                                />
                            </div>
                            <div class="activities-grid">
                                <div v-for="(activity, activityIdx) in vessel.activities" :key="activity.key" class="activity-row">
                                    <div class="activity-label">
                                        <input 
                                            v-model="activity.label" 
                                            type="text"
                                            class="activity-name-input"
                                            :placeholder="activity.key"
                                        />
                                    </div>
                                    <div class="color-picker-group">
                                        <div class="color-input-wrapper">
                                            <label>填充色</label>
                                            <input 
                                                v-model="activity.color" 
                                                type="text"
                                                class="color-input hex-input"
                                                placeholder="#009bff4d"
                                            />
                                            <input
                                                :value="getFillColorHex(activity.color)"
                                                type="color"
                                                class="native-color-picker"
                                                @input="onFillColorPick(activity, $event.target.value)"
                                            />
                                            <input
                                                :value="getFillAlpha(activity.color)"
                                                type="range"
                                                class="alpha-slider"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                @input="onFillAlphaChange(activity, $event.target.value)"
                                            />
                                            <span class="alpha-value">{{ getFillAlpha(activity.color) }}</span>
                                        </div>
                                        <div class="color-input-wrapper">
                                            <label>邊框色</label>
                                            <input 
                                                v-model="activity.border" 
                                                type="text"
                                                class="color-input hex-input"
                                                placeholder="#000000"
                                            />
                                            <input
                                                :value="normalizeHex(activity.border)"
                                                type="color"
                                                class="native-color-picker"
                                                @input="onBorderColorPick(activity, $event.target.value)"
                                            />
                                        </div>
                                        <div class="color-preview">
                                            <div :style="{ 
                                                background: activity.color,
                                                border: `2px solid ${activity.border}`
                                            }"></div>
                                        </div>
                                    </div>
                                    <button class="btn-remove-activity" @click="removeActivity(vessel, activityIdx)">刪除</button>
                                </div>
                            </div>
                            <div class="vessel-footer">
                                <button class="btn-add-activity" @click="addActivity(vessel)">＋ 新增項目</button>
                            </div>
                        </div>
                    </div>

                    <!-- 快速重置服務 -->
                    <div class="settings-section reset-section">
                        <button class="btn-reset" @click="resetToDefaults">
                            ⟲ 恢復預設設定
                        </button>
                    </div>
                </div>
                <div class="modal-footer settings-footer">
                    <button class="btn-cancel" @click="closeModal">取消</button>
                    <button class="btn-save" @click="saveSettings">儲存設定</button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { getSettings, updateSettings, resetSettings } from '@/appSettings'

export default {
    name: 'SettingsModal',
    props: {
        visible: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            formData: {
                timeIntervalHours: 6,
                vessels: []
            }
        }
    },
    watch: {
        visible(newVal) {
            if (newVal) {
                this.loadSettings()
            }
        }
    },
    methods: {
        loadSettings() {
            const settings = getSettings()
            this.formData = JSON.parse(JSON.stringify(settings))

            // 兼容舊資料：若填充色仍為 rgba 或 #RRGGBB，統一轉為 #RRGGBBAA
            this.formData.vessels.forEach(vessel => {
                vessel.activities.forEach(activity => {
                    activity.color = this.normalizeHexa(activity.color)
                })
            })
        },
        saveSettings() {
            // 驗證設定
            if (this.formData.timeIntervalHours < 1 || this.formData.timeIntervalHours > 24) {
                alert('時間間隔必須介於 1 到 24 小時之間')
                return
            }

            // 驗證顏色格式
            for (const vessel of this.formData.vessels) {
                for (const activity of vessel.activities) {
                    if (!this.isValidHexaColor(activity.color)) {
                        alert(`船隻"${vessel.name}"中"${activity.label}"的填充色格式不正確\n應為 #RRGGBBAA 格式`)
                        return
                    }
                    if (!this.isValidHexColor(activity.border)) {
                        alert(`船隻"${vessel.name}"中"${activity.label}"的邊框色格式不正確\n應為 #RRGGBB 格式`)
                        return
                    }
                }
            }

            updateSettings(this.formData)
            this.$emit('update-settings', this.formData)
            this.closeModal()
        },
        resetToDefaults() {
            if (confirm('確定要恢復所有設定到預設值嗎？')) {
                resetSettings()
                this.loadSettings()
            }
        },
        closeModal() {
            this.$emit('close')
        },
        addActivity(vessel) {
            if (!vessel.activities) vessel.activities = []

            let idx = vessel.activities.length + 1
            let key = `custom_${idx}`
            while (vessel.activities.some(a => a.key === key)) {
                idx += 1
                key = `custom_${idx}`
            }

            let labelIdx = 1
            let label = `新項目${labelIdx}`
            while (vessel.activities.some(a => a.label === label)) {
                labelIdx += 1
                label = `新項目${labelIdx}`
            }

            vessel.activities.push({
                key,
                label,
                color: '#009bff4d',
                border: '#009bff'
            })
        },
        removeActivity(vessel, activityIdx) {
            if (!vessel.activities || activityIdx < 0 || activityIdx >= vessel.activities.length) return
            vessel.activities.splice(activityIdx, 1)
        },
        isValidHexaColor(color) {
            const hexaRegex = /^#[0-9a-fA-F]{8}$/
            return hexaRegex.test((color || '').trim())
        },
        isValidHexColor(color) {
            const hexRegex = /^#[0-9a-fA-F]{6}$/
            return hexRegex.test(color.trim())
        },
        parseRgbaColor(color) {
            const match = color.trim().match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/)
            if (!match) return null

            const r = Math.max(0, Math.min(255, Number(match[1])))
            const g = Math.max(0, Math.min(255, Number(match[2])))
            const b = Math.max(0, Math.min(255, Number(match[3])))
            const a = Math.max(0, Math.min(1, Number(match[4])))

            return { r, g, b, a }
        },
        toHex(n) {
            return Number(n).toString(16).padStart(2, '0')
        },
        parseHexaColor(hexaColor) {
            const value = (hexaColor || '').trim()
            const match = value.match(/^#([0-9a-fA-F]{8})$/)
            if (!match) return null
            const hex = match[1]
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            const a = parseInt(hex.slice(6, 8), 16) / 255
            return { r, g, b, a }
        },
        normalizeHexa(colorValue) {
            const value = (colorValue || '').trim()

            if (this.isValidHexaColor(value)) return value.toLowerCase()
            if (this.isValidHexColor(value)) return `${value.toLowerCase()}ff`

            const rgba = this.parseRgbaColor(value)
            if (rgba) {
                const alphaHex = this.toHex(Math.round(rgba.a * 255))
                return `#${this.toHex(rgba.r)}${this.toHex(rgba.g)}${this.toHex(rgba.b)}${alphaHex}`
            }

            return '#0000004d'
        },
        getFillColorHex(hexaColor) {
            const parsed = this.parseHexaColor(this.normalizeHexa(hexaColor))
            if (!parsed) return '#000000'
            return `#${this.toHex(parsed.r)}${this.toHex(parsed.g)}${this.toHex(parsed.b)}`
        },
        getFillAlpha(hexaColor) {
            const parsed = this.parseHexaColor(this.normalizeHexa(hexaColor))
            return parsed ? parsed.a.toFixed(2) : '0.30'
        },
        normalizeHex(hexColor) {
            const value = (hexColor || '').trim()
            return this.isValidHexColor(value) ? value : '#000000'
        },
        onFillColorPick(activity, hexColor) {
            const parsed = this.parseHexaColor(this.normalizeHexa(activity.color))
            const alpha = parsed ? parsed.a : 0.3
            const hex = this.normalizeHex(hexColor)

            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            const alphaHex = this.toHex(Math.round(alpha * 255))

            activity.color = `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}${alphaHex}`
        },
        onFillAlphaChange(activity, alphaValue) {
            const parsed = this.parseHexaColor(this.normalizeHexa(activity.color)) || { r: 0, g: 0, b: 0 }
            const alpha = Math.max(0, Math.min(1, Number(alphaValue)))
            const alphaHex = this.toHex(Math.round(alpha * 255))
            activity.color = `#${this.toHex(parsed.r)}${this.toHex(parsed.g)}${this.toHex(parsed.b)}${alphaHex}`
        },
        onBorderColorPick(activity, hexColor) {
            activity.border = this.normalizeHex(hexColor)
        }
    }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
    transition: transform 0.22s ease, opacity 0.22s ease;
}

.modal-fade-enter .modal-dialog,
.modal-fade-leave-to .modal-dialog {
    transform: translateY(10px) scale(0.98);
    opacity: 0;
}

.modal-dialog {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.22);
    width: 700px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.settings-dialog {
    width: 850px;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #eee;
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.1em;
    cursor: pointer;
    color: #888;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 4px;
    &:hover { 
        background: #f0f0f0; 
        color: #333; 
    }
}

.modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
}

.settings-body {
    max-height: calc(90vh - 120px);
}

.settings-section {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 16px;
    background: #fafafa;
}

.settings-section-title {
    margin: 0 0 12px;
    font-size: 1em;
    font-weight: 600;
    color: #333;
}

.form-row {
    display: flex;
    align-items: center;
    gap: 12px;
    
    label {
        width: 110px;
        flex-shrink: 0;
        font-size: 0.9em;
        color: #555;
        font-weight: 500;
    }
    
    select {
        flex: 0 0 auto;
        padding: 6px 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background: #fff;
        font-size: 0.9em;
        &:focus { 
            outline: none; 
            border-color: #1a6fd4; 
            box-shadow: 0 0 0 2px rgba(26,111,212,0.15); 
        }
    }
}

.time-interval-select {
    width: 150px;
}

.time-interval-hint {
    color: #888;
    font-size: 0.85em;
    margin-left: auto;
}

// 船隻設定區塊
.vessel-settings-block {
    margin-bottom: 16px;
    
    &:last-child {
        margin-bottom: 0;
    }
}

.vessel-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #ddd;
}

.vessel-name-input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.95em;
    font-weight: 600;
    color: #333;
    
    &:focus {
        outline: none;
        border-color: #1a6fd4;
        box-shadow: 0 0 0 2px rgba(26,111,212,0.15);
    }
}

.activities-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.vessel-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
}

.btn-add-activity {
    padding: 6px 12px;
    border: 1px solid #1a6fd4;
    border-radius: 4px;
    background: #f3f8ff;
    color: #1a6fd4;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;

    &:hover {
        background: #e6f0ff;
    }
}

.activity-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
}

.btn-remove-activity {
    flex: 0 0 auto;
    padding: 6px 10px;
    border: 1px solid #d9534f;
    border-radius: 4px;
    background: #fff5f5;
    color: #b9403b;
    cursor: pointer;
    font-size: 0.82em;
    font-weight: 600;

    &:hover {
        background: #ffeaea;
    }
}

.activity-label {
    flex: 0 0 80px;
}

.activity-name-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    
    &:focus {
        outline: none;
        border-color: #1a6fd4;
        box-shadow: 0 0 0 2px rgba(26,111,212,0.15);
    }
}

.color-picker-group {
    display: flex;
    gap: 12px;
    flex: 1;
}

.color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    
    label {
        flex: 0 0 45px;
        font-size: 0.8em;
        color: #666;
        font-weight: 500;
    }
}

.color-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.8em;
    font-family: 'Courier New', monospace;
    
    &:focus {
        outline: none;
        border-color: #1a6fd4;
        box-shadow: 0 0 0 2px rgba(26,111,212,0.15);
    }
    
    &.hex-input {
        max-width: 100px;
    }
}

.native-color-picker {
    width: 34px;
    height: 28px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
}

.alpha-slider {
    width: 80px;
}

.alpha-value {
    width: 34px;
    text-align: right;
    font-size: 0.78em;
    color: #666;
    font-family: 'Courier New', monospace;
}

.color-preview {
    flex: 0 0 36px;
    height: 28px;
    border-radius: 3px;
    border: 1px solid #ddd;
    overflow: hidden;
    
    div {
        width: 100%;
        height: 100%;
    }
}

// 重置按鈕區段
.reset-section {
    text-align: center;
    padding: 12px;
}

.btn-reset {
    padding: 8px 20px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background: #fff;
    color: #666;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 500;
    
    &:hover {
        background: #f5f5f5;
        border-color: #ccc;
        color: #333;
    }
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px 16px;
    border-top: 1px solid #eee;
}

.settings-footer {
    flex-shrink: 0;
}

.btn-cancel {
    padding: 7px 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 0.9em;
    
    &:hover { 
        background: #e8e8e8; 
    }
}

.btn-save {
    padding: 7px 22px;
    border: none;
    border-radius: 5px;
    background: #1a6fd4;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    
    &:hover { 
        background: #155ab8; 
    }
}
</style>
