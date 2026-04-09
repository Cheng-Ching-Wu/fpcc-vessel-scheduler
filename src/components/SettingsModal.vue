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
                                                :value="activity.color"
                                                type="text"
                                                readonly
                                                class="color-input hex-input fill-readonly"
                                                title="填充色 = 邊框色 + 透明度"
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
                                                @input="onBorderHexInput(activity, $event.target.value)"
                                            />
                                            <input
                                                :value="normalizeHex(activity.border)"
                                                type="color"
                                                class="native-color-picker"
                                                @input="onBorderColorPick(activity, $event.target.value)"
                                            />
                                        </div>
                                        <div class="color-preview" title="色塊預覽">
                                            <div :style="{ 
                                                background: activity.color,
                                                border: `2px solid ${activity.border}`
                                            }"></div>
                                        </div>
                                    </div>
                                    <button class="btn-remove-activity" @click="removeActivity(vessel, activityIdx)" title="刪除">✕</button>
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

            // 兼容舊資料，並將填充色 RGB 同步為邊框色
            this.formData.vessels.forEach(vessel => {
                vessel.activities.forEach(activity => {
                    activity.color = this.normalizeHexa(activity.color)
                    const alpha = this.getFillAlpha(activity.color)
                    activity.color = this.buildFillColor(activity.border, alpha)
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
        buildFillColor(borderHex, alpha) {
            const border = this.normalizeHex(borderHex)
            const r = parseInt(border.slice(1, 3), 16)
            const g = parseInt(border.slice(3, 5), 16)
            const b = parseInt(border.slice(5, 7), 16)
            const a = Math.max(0, Math.min(1, Number(alpha)))
            const alphaHex = this.toHex(Math.round(a * 255))
            return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}${alphaHex}`
        },
        onFillAlphaChange(activity, alphaValue) {
            activity.color = this.buildFillColor(activity.border, alphaValue)
        },
        onBorderColorPick(activity, hexColor) {
            activity.border = this.normalizeHex(hexColor)
            activity.color = this.buildFillColor(activity.border, this.getFillAlpha(activity.color))
        },
        onBorderHexInput(activity, hexValue) {
            activity.color = this.buildFillColor(hexValue, this.getFillAlpha(activity.color))
        }
    }
}
</script>

<style lang="scss" scoped>

.modal-dialog {
    width: 700px;
    max-height: 90vh;
}

.settings-dialog {
    width: 800px;
}

.modal-body {
    gap: 20px;
}

.settings-body {
    max-height: calc(90vh - 120px);
}

.settings-section {
    border: 1px solid $color-border-light;
    border-radius: 8px;
    padding: 16px;
    background: $color-bg-card;
}

.settings-section-title {
    margin: 0 0 12px;
    font-size: 1em;
    font-weight: 600;
    color: $color-text;
}

.form-row {
    gap: 12px;

    label {
        width: 110px;
    }

    select {
        flex: 0 0 auto;
    }
}

.time-interval-select {
    width: 150px;
}

.time-interval-hint {
    color: $color-text-hint;
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
    padding: 8px 0;
    border-top: 2px solid $color-border-medium;
}

.vessel-name-input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid $color-border;
    border-radius: 4px;
    font-size: 0.95em;
    font-weight: 600;
    color: $color-text;
    
    &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: $focus-ring;
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
    border: 1px solid $color-primary;
    border-radius: 4px;
    background: $color-bg-primary-light;
    color: $color-primary;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;

    &:hover {
        background: $color-bg-primary-hover;
    }
}

.activity-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: $color-white;
    border-radius: 4px;
    border: 1px solid $color-border-soft;
}

.btn-remove-activity {
    flex: 0 0 auto;
    padding: 6px 10px;
    border: 1px solid $color-danger-border;
    border-radius: 4px;
    background: $color-bg-danger-light;
    color: $color-danger-text;
    cursor: pointer;
    font-size: 0.82em;
    font-weight: 600;

    &:hover {
        background: $color-bg-danger-hover;
    }
}

.activity-label {
    flex: 0 0 80px;
}

.activity-name-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid $color-border;
    border-radius: 4px;
    font-size: 0.9em;
    
    &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: $focus-ring;
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
        color: $color-text-secondary;
        font-weight: 500;
    }
}

.color-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid $color-border;
    border-radius: 4px;
    font-size: 0.8em;
    font-family: 'Courier New', monospace;
    
    &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: $focus-ring;
    }
    
    &.hex-input {
        max-width: 100px;
    }
}

.fill-readonly {
    background: $color-bg-subtle;
    color: $color-text-faded;
    cursor: default;
}

.native-color-picker {
    width: 34px;
    height: 28px;
    padding: 0;
    border: 1px solid $color-border;
    border-radius: 4px;
    background: $color-white;
    cursor: pointer;
}

.alpha-slider {
    width: 80px;
}

.alpha-value {
    width: 34px;
    text-align: right;
    font-size: 0.78em;
    color: $color-text-secondary;
    font-family: 'Courier New', monospace;
}

.color-preview {
    flex: 0 0 36px;
    height: 28px;
    border-radius: 3px;
    border: 1px solid $color-border-medium;
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
    border: 1px solid $color-border-medium;
    border-radius: 5px;
    background: $color-white;
    color: $color-text-secondary;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 500;
    
    &:hover {
        background: $color-bg-subtle;
        border-color: $color-border;
        color: $color-text;
    }
}

.settings-footer {
    flex-shrink: 0;
}
</style>
