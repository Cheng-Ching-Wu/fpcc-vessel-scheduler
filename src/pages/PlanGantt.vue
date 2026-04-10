<template>
    <div class="plan-gantt-wrapper" @click="hideContextMenu">
        <div class="plan-gantt-legend">
            <div v-for="item in legendData" :key="item.key" class="legend-item">
                <div 
                    class="legend-swatch"
                    :style="{ 
                        background: item.color,
                        borderColor: item.border
                    }"
                ></div>
                <span class="legend-label">{{ item.label }}</span>
            </div>
        </div>
        <div class="plan-gantt-nav">
            <span class="nav-timeinterval">單位時間: {{ timeIntervalHours }} 小時/格 ｜ 拖曳最小單位: {{ dragSnapMinutes }} 分鐘</span>
            <div class="nav-spacer"></div>
            <a role="button" class="nav-btn" @click="prevWeek">&#8249;</a>
            <select class="nav-select" v-model.number="selectedYear" @change="onYearWeekChange">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <select class="nav-select" v-model.number="selectedWeek" @change="onYearWeekChange">
                <option v-for="w in weekOptions" :key="w" :value="w">第 {{ w }} 週</option>
            </select>
            <a role="button" class="nav-btn" @click="nextWeek">&#8250;</a>
            <div class="nav-spacer"></div>
            <a role="button" class="nav-btn today-btn" @click="goToday">今天</a>
            <a role="button" class="nav-btn settings-btn" @click.stop="openSettingsModal">⚙ 設定</a>
            <a role="button" class="nav-btn add-btn" @click.stop="openAddModal">＋ 新增</a>
        </div>
        <div class="plan-gantt">
            <div ref="ganttEl" style="width:100%;"></div>
        </div>

        <!-- 右鍵選單 -->
        <div v-if="contextMenu.visible" class="context-menu"
            :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
            @click.stop>
            <div class="context-menu-item" @click="openEditModal(contextMenu.act, contextMenu.taskId); hideContextMenu()">
                ✎ 編輯
            </div>
            <div class="context-menu-item context-menu-item--danger" @click="requestDelete(contextMenu.act, contextMenu.taskId); hideContextMenu()">
                🗑 刪除
            </div>
        </div>

        <!-- 新增 / 編輯彈窗 -->
        <transition name="modal-fade">
            <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <span>{{ modalMode === 'add' ? '新增項目' : '編輯項目' }}</span>
                        <button class="modal-close" @click="closeModal">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <label>船隻</label>
                            <select v-model="modalForm.vessel" @change="modalForm.type = ''">
                                <option value="">請選擇</option>
                                <option v-for="v in vesselOptions" :key="v.prefix" :value="v.prefix">{{ v.name }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>項目類型</label>
                            <select v-model="modalForm.type" :disabled="!modalForm.vessel">
                                <option value="">請選擇</option>
                                <option v-for="t in availableTypes" :key="t.key" :value="t.key">{{ t.label }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>標籤</label>
                            <input type="text" v-model="modalForm.label" placeholder="請輸入標籤" />
                        </div>
                        <div class="form-row">
                            <label>開始時間</label>
                            <input type="date" v-model="modalForm.startDate" />
                            <select v-model="modalForm.startTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>結束時間</label>
                            <input type="date" v-model="modalForm.endDate" />
                            <select v-model="modalForm.endTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" @click="closeModal">取消</button>
                        <button class="btn-save" @click="saveModal">儲存</button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- 刪除確認彈窗 -->
        <transition name="modal-fade">
            <div v-if="deleteConfirmVisible" class="modal-overlay" @click.self="cancelDelete">
                <div class="modal-dialog delete-confirm-dialog">
                    <div class="modal-body delete-confirm-body">
                        <h3>確定要刪除以下資料嗎？</h3>
                        <div class="delete-info-line">
                            <span>項目：</span>
                            <h3>{{ deleteTargetItem }}</h3>
                        </div>
                        <div class="delete-info-line">
                            <span>起迄：</span>
                            <h3>{{ deleteTargetTimeRange }}</h3>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" @click="cancelDelete">取消</button>
                        <button class="btn-danger" @click="confirmDelete">確認刪除</button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- 設定彈窗 -->
        <SettingsModal 
            :visible="settingsModalVisible" 
            @close="closeSettingsModal"
            @update-settings="handleSettingsUpdate"
        />
    </div>
</template>

<script>
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import SettingsModal from '@/components/SettingsModal.vue'
import { getSettings, initializeSettings } from '@/appSettings'

// 船隻群組（vessel label overlay 用）
const VESSELS = [
    { name: '油駁船1', ids: ['s1_bunkering','s1_transfer','s1_maintenance','s1_breakdown','s1_other'] },
    { name: '油駁船2', ids: ['s2_bunkering','s2_transfer','s2_maintenance','s2_breakdown','s2_other'] },
    { name: '工作船3', ids: ['s3_transport','s3_patrol','s3_maintenance','s3_breakdown','s3_other'] },
]

// 每列實際要畫的 task bars（同列可多個）
const d = (mo, day, h = 0) => new Date(2025, mo - 1, day, h, 0)

const ACTIVITIES = [
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'bunkering', activityLabel: '補油', label: 'X', start: d(9,28,12), end: d(9,29,12)  },
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'bunkering', activityLabel: '補油', label: 'J', start: d(9,30,6),  end: d(9,30,18)  },
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'bunkering', activityLabel: '補油', label: 'K', start: d(10,2,6),  end: d(10,2,18)  },
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'bunkering', activityLabel: '補油', label: 'Y', start: d(10,5,12), end: d(10,6,12)  },
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'transfer',  activityLabel: '駁油', label: 'J', start: d(10,1,0),  end: d(10,2,6)   },
    { vesselPrefix: 's1', vesselName: '油駁船1', activityKey: 'transfer',  activityLabel: '駁油', label: 'K', start: d(10,3,0),  end: d(10,4,6)   },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'A', start: d(9,30,0),  end: d(9,30,12)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'B', start: d(9,30,0),  end: d(9,30,12)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'C', start: d(9,30,0),  end: d(9,30,12)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'D', start: d(10,2,6),  end: d(10,2,18)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'L', start: d(10,2,6),  end: d(10,2,18)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'bunkering', activityLabel: '補油', label: 'H', start: d(10,2,6),  end: d(10,2,18)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'W', start: d(9,28,18), end: d(9,29,6)   },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'A', start: d(10,1,0),  end: d(10,1,6)   },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'C', start: d(10,1,6),  end: d(10,1,12)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'B', start: d(10,1,12), end: d(10,2,0)   },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'H', start: d(10,3,6),  end: d(10,3,18)  },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'L', start: d(10,4,6),  end: d(10,5,0)   },
    { vesselPrefix: 's2', vesselName: '油駁船2', activityKey: 'transfer',  activityLabel: '駁油', label: 'Z', start: d(10,5,18), end: d(10,6,18)  },
    { vesselPrefix: 's3', vesselName: '工作船3', activityKey: 'patrol',    activityLabel: '警戒', label: 'J', start: d(10,1,0),  end: d(10,1,18)  },
    { vesselPrefix: 's3', vesselName: '工作船3', activityKey: 'patrol',    activityLabel: '警戒', label: 'K', start: d(10,3,0),  end: d(10,4,6)   },
    { vesselPrefix: 's3', vesselName: '工作船3', activityKey: 'patrol',    activityLabel: '警戒', label: 'L', start: d(10,4,6),  end: d(10,5,0)   },
]

function getActsForTask(taskId) {
    return ACTIVITIES.filter(a => `${a.vesselPrefix}_${a.activityKey}` === taskId)
}

function getTaskIds() {
    return [...new Set(ACTIVITIES.map(a => `${a.vesselPrefix}_${a.activityKey}`))]
}

/**
 * 對同一列的 activities 計算不重疊分道（greedy interval scheduling），
 * 並將結果寫入每個 act._lane。
 * 回傳 totalLanes。
 */
/**
 * 對同一列的 activities 計算不重疊分道，結果寫入 act._lane。
 *
 * draggedAct 為 null（初始化或跨列）：完整從頭按起始時間 greedy 分配。
 * draggedAct 有值（同列拖曳/縮放）：
 *   Step 1 — 只重新指定 draggedAct 的 lane（其他 bar _lane 完全不變）。
 *   Step 2 — compact pass：非拖曳 bar 由低 lane 往高 lane 掃，
 *             若能移到更低 lane（無衝突）則向下收合，滿足「無重疊即合併」要求。
 */
function assignLanes(acts, draggedAct = null) {
    if (!acts.length) return 1

    if (draggedAct) {
        // Step 1：只算 draggedAct 的最低可用 lane
        const s = draggedAct.start.getTime()
        const e = draggedAct.end.getTime()
        let lane = 0
        while (acts.some(o => o !== draggedAct &&
            (o._lane ?? 0) === lane &&
            s < o.end.getTime() && o.start.getTime() < e)) lane++
        draggedAct._lane = lane

        // Step 2：compact pass（非拖曳 bar 只往下移，不往上）
        // 由低 lane 到高 lane 依序嘗試，確保空出的位置能被後面的 bar 填上
        acts
            .filter(a => a !== draggedAct && (a._lane ?? 0) > 0)
            .sort((a, b) => (a._lane ?? 0) - (b._lane ?? 0))
            .forEach(act => {
                const as = act.start.getTime(), ae = act.end.getTime()
                for (let l = 0; l < (act._lane ?? 0); l++) {
                    const blocked = acts.some(o =>
                        o !== act && (o._lane ?? 0) === l &&
                        as < o.end.getTime() && o.start.getTime() < ae)
                    if (!blocked) { act._lane = l; break }
                }
            })
    } else {
        // 完整重算（初始化或跨列後）
        const byStart = [...acts].sort((a, b) => a.start.getTime() - b.start.getTime())
        const segs = [] // segs[lane] = [{ start, end }, ...]
        byStart.forEach(act => {
            let assigned = -1
            for (let l = 0; l < segs.length; l++) {
                const s = act.start.getTime(), e = act.end.getTime()
                if (segs[l].every(seg => s >= seg.end || e <= seg.start)) { assigned = l; break }
            }
            if (assigned === -1) { assigned = segs.length; segs.push([]) }
            segs[assigned].push({ start: act.start.getTime(), end: act.end.getTime() })
            act._lane = assigned
        })
    }

    return Math.max(...acts.map(a => a._lane ?? 0), 0) + 1
}

// 初始化時對所有列執行一次分道
getTaskIds().forEach(id => assignLanes(getActsForTask(id)))

const BASE_ROW_H = 35

export default {
    name: 'PlanGantt',
    components: {
        SettingsModal
    },
    data() {
        return {
            currentWeekStart: null,
            selectedYear: new Date().getFullYear(),
            selectedWeek: 1,
            settingsModalVisible: false,
            timeIntervalHours: 6,
            dragSnapMinutes: 30,
            modalVisible: false,
            modalMode: 'add',
            modalForm: {
                vessel: '', type: '', label: '',
                startDate: '', startTime: '00:00',
                endDate: '',   endTime: '00:00',
            },
            editTaskId: null,
            editAct: null,
            contextMenu: { visible: false, x: 0, y: 0, act: null, taskId: null },
            deleteConfirmVisible: false,
            pendingDeleteAct: null,
            pendingDeleteTaskId: null,
            legendData: [
                { key: 'bunkering', label: '補油', color: 'rgba(0,155,255,0.30)', border: '#009bff' },
                { key: 'transfer', label: '駁油', color: 'rgba(178,71,255,0.30)', border: '#b247ff' },
                { key: 'maintenance', label: '維修', color: 'rgba(230,140,0,0.30)', border: '#e68c00' },
                { key: 'breakdown', label: '故障', color: 'rgba(185,0,18,0.30)', border: '#b90012' },
                { key: 'other', label: '其他', color: 'rgba(192,192,192,0.30)', border: '#b0b0b0' },
                { key: 'transport', label: '載運', color: 'rgba(0,170,180,0.30)', border: '#00aab4' },
                { key: 'patrol', label: '警戒', color: 'rgba(255,0,26,0.30)', border: '#ff001a' },
            ]
        }
    },
    created() {
        // 初始化設定
        initializeSettings()
        const settings = getSettings()
        this.timeIntervalHours = settings.timeIntervalHours

        // 從 legendData 產生 TYPE_COLORS（保持全域引用）
        window.TYPE_COLORS = {}
        this.legendData.forEach(item => {
            window.TYPE_COLORS[item.key] = { color: item.color, border: item.border }
        })

        // ── 初始週範圍計算（不需 DOM，在 created 完成）──
        const refDate = new Date(2025, 8, 30)
        const dow = refDate.getDay()
        const daysToMon = dow === 0 ? 6 : dow - 1
        const initStart = new Date(refDate)
        initStart.setDate(refDate.getDate() - daysToMon)
        initStart.setHours(0, 0, 0, 0)
        this.currentWeekStart = initStart
        this.syncYearWeekFromWeekStart()

        // ── Gantt 靜態設定（不需 DOM，init 前設定即可）──
        const DOW = ['日', '一', '二', '三', '四', '五', '六']
        gantt.config.columns = [
            { name: 'text', label: '項目', width: 112, align: 'center' },
        ]
        gantt.config.scales = [
            {
                unit: 'day', step: 1,
                format: date => `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} (${DOW[date.getDay()]})`
            },
            {
                unit: 'hour', step: this.timeIntervalHours, height: 40,
                format: date => {
                    const pad = n => String(n).padStart(2, '0')
                    const h1  = pad(date.getHours())
                    const end = new Date(date.getTime() + this.timeIntervalHours * 60 * 60 * 1000)
                    const h2  = pad(end.getHours())
                    return `<div style="line-height:1.2">${h1}:00<br>${h2}:00</div>`
                }
            }
        ]
        gantt.config.start_date = this.currentWeekStart
        gantt.config.end_date   = new Date(this.currentWeekStart.getTime() + 7 * 86400000)
        gantt.config.show_progress = false
        gantt.config.readonly      = true
        gantt.config.drag_links    = false
        gantt.config.drag_progress = false
        gantt.config.column_width  = 60
        gantt.config.scale_height  = 70
        gantt.config.autosize      = 'y'

        // ── Gantt 模板（純函式賦值，不需 DOM）──
        gantt.templates.task_class = () => 'hidden-bar'
        gantt.templates.task_text  = () => ''
        gantt.templates.timeline_cell_class = (_t, date) =>
            date.getHours() === 0 ? 'day-start' : ''
    },
    mounted() {
        // Hover tooltip（需 DOM 存在才建立）
        const hoverTooltip = this._hoverTooltip = document.createElement('div')
        hoverTooltip.className = 'plan-gantt-hover-tooltip'
        document.body.appendChild(hoverTooltip)

        // focus 狀態追蹤（跨 re-render 保留，以 instance property 存放）
        this._focusedAct = null

        // ── 在 onGanttRender 手動繪製多 bar + vessel overlay ──
        gantt.attachEvent('onGanttRender', () => {
            const wsMs = gantt.config.start_date.getTime()
            const weMs = gantt.config.end_date.getTime()

            // ── Vessel label overlay（模擬 rowspan）+ 暫無資料 overlay ──
            document.querySelectorAll('.vessel-label-overlay, .vessel-no-data-overlay').forEach(el => el.remove())
            const gridData = document.querySelector('.gantt_grid_data')
            if (gridData) {

                VESSELS.forEach(({ name, ids }) => {
                    const firstIdx = gantt.getTaskIndex(ids[0])
                    if (firstIdx === -1) return
                    const lastIdx = gantt.getTaskIndex(ids[ids.length - 1])
                    if (lastIdx === -1) return

                    const top = gantt.getRowTop(firstIdx)
                    const lastTask = gantt.getTaskByIndex(lastIdx)
                    const lastRowH = (lastTask && lastTask.row_height) || gantt.config.row_height
                    const height = (gantt.getRowTop(lastIdx) + lastRowH) - top

                    const el = document.createElement('div')
                    el.className  = 'vessel-label-overlay'
                    el.textContent = name
                    Object.assign(el.style, {
                        top:    `${top}px`,
                        height: `${height}px`,
                    })
                    gridData.appendChild(el)

                    // 當週無資料時，整個項目欄覆蓋「暫無資料」（取代 vessel label）
                    const hasData = ids.some(id =>
                        getActsForTask(id).some(a =>
                            a.end.getTime() > wsMs && a.start.getTime() < weMs
                        )
                    )
                    // 無資料時移除 vessel-label-overlay（列已被 CSS 完全隱藏）
                    if (!hasData) el.remove()
                })
            }

            // ── 無資料船的所有 DOM 列：用 CSS class 隱藏，不碰 gantt 自己的 inline height ──
            VESSELS.forEach(({ ids }) => {
                const hasData = ids.some(id =>
                    getActsForTask(id).some(a =>
                        a.end.getTime() > wsMs && a.start.getTime() < weMs
                    )
                )
                ids.forEach(id => {
                    document.querySelectorAll(`[data-task-id="${id}"]`).forEach(row => {
                        row.classList.toggle('gantt-row-hidden', !hasData)
                    })
                })
            })

            // ── 手動繪製多 task bar（取代 addTaskLayer）──
            document.querySelectorAll('.custom-act-bar').forEach(el => el.remove())
            const dataArea = document.querySelector('.gantt_data_area')
            if (!dataArea) return

            const timelineStart = gantt.config.start_date.getTime()
            // 用 gantt.posFromDate 計算實際渲染的 msPerPx，確保與表頭時間完全對齊
            const _px6h  = gantt.posFromDate(new Date(timelineStart + 6 * 3600000))
            const msPerPx = 6 * 3600000 / _px6h
            const SNAP_MS  = this.dragSnapMinutes * 60 * 1000
            const snapMs   = ms => Math.round(ms / SNAP_MS) * SNAP_MS
            // Math.round 確保回傳整數 px，避免浮點誤差累積
            const snapPx   = px => Math.round((snapMs(timelineStart + px * msPerPx) - timelineStart) / msPerPx)

            getTaskIds().forEach(taskId => {
                const acts = getActsForTask(taskId)
                if (!acts || acts.length === 0) return
                const idx = gantt.getTaskIndex(taskId)
                if (idx === -1) return
                const rowTop = gantt.getRowTop(idx)

                // 依 taskId 後綴取得類型顏色（格式: s1_bunkering → bunkering）
                const actType = taskId.replace(/^s\d+_/, '')
                const legendItem = this.legendData.find(item => item.key === actType)
                const typeColor = legendItem?.color || 'transparent'
                const typeBorder = legendItem?.border || '#888'

                // 計算重疊分道（區塊保持原高度，列高由 row_height 撐開）
                // _lane 已在 assignLanes 初始化時寫入，直接讀取即可
                const barH = BASE_ROW_H - 8

                acts.forEach((act) => {
                    // 超出本週範圍則跳過不渲染
                    const weekStartMs = gantt.config.start_date.getTime()
                    const weekEndMs   = gantt.config.end_date.getTime()
                    if (act.end.getTime() <= weekStartMs || act.start.getTime() >= weekEndMs) return

                    // 視覺位置裁切至本週範圍（tooltip 仍顯示原始 act.start/end）
                    const visStart = new Date(Math.max(act.start.getTime(), weekStartMs))
                    const visEnd   = new Date(Math.min(act.end.getTime(), weekEndMs))
                    const left  = gantt.posFromDate(visStart)
                    const width = gantt.posFromDate(visEnd) - left

                    const lane      = act._lane ?? 0
                    const barTop    = rowTop + 4 + lane * BASE_ROW_H
                    const barHeight = barH

                    // 偵測跨週裁切
                    const isLeftClipped  = act.start.getTime() < weekStartMs
                    const isRightClipped = act.end.getTime()   > weekEndMs

                    const bar = document.createElement('div')
                    bar.className = 'custom-act-bar'
                    if (isLeftClipped)  bar.classList.add('bar-left-clipped')
                    if (isRightClipped) bar.classList.add('bar-right-clipped')
                    bar.style.cssText = `
                        left:${left}px;
                        width:${Math.max(width, 30)}px;
                        top:${barTop}px;
                        height:${barHeight}px;
                        background:${typeColor};
                        border:2px solid ${typeBorder};
                        color:${typeBorder};
                        --bar-border-color:${typeBorder};
                    `
                    // 儲存邊框色，re-render 後若此 act 仍被 focus 就還原樣式
                    bar.dataset.borderColor = typeBorder
                    if (act === this._focusedAct) this.applyFocusStyle(bar)

                    const labelEl = document.createElement('span')
                    labelEl.className = 'bar-label'
                    labelEl.textContent = act.label
                    bar.appendChild(labelEl)

                    // 跨週箭頭指示器（置於 bar 內側邊緣，避免被 gantt_data_area overflow:hidden 裁掉）
                    if (isLeftClipped) {
                        const arrow = document.createElement('div')
                        arrow.className = 'bar-arrow bar-arrow--left'
                        bar.appendChild(arrow)
                    }
                    if (isRightClipped) {
                        const arrow = document.createElement('div')
                        arrow.className = 'bar-arrow bar-arrow--right'
                        bar.appendChild(arrow)
                    }

                    // 左側縮放把手（跨週裁切側仍加，可調整週外時間）
                    const lHandle = document.createElement('div')
                    lHandle.className = 'bar-resize-handle bar-resize-left'
                    bar.appendChild(lHandle)

                    // 右側縮放把手（跨週裁切側仍加，可調整週外時間）
                    const rHandle = document.createElement('div')
                    rHandle.className = 'bar-resize-handle bar-resize-right'
                    bar.appendChild(rHandle)

                    // ── Hover tooltip ──
                    bar.addEventListener('mouseenter', () => {
                        const r = bar.getBoundingClientRect()
                        this.positionTooltip(hoverTooltip, r, `項目: ${legendItem?.label ?? actType}  ${act.label}\n開始: ${this.fmtDt(act.start)}\n結束: ${this.fmtDt(act.end)}`)
                    })
                    bar.addEventListener('mouseleave', () => {
                        hoverTooltip.style.display = 'none'
                    })

                    // ── 右鍵選單 ──
                    bar.addEventListener('contextmenu', e => {
                        e.preventDefault()
                        e.stopPropagation()
                        hoverTooltip.style.display = 'none'
                        this.openContextMenu(e, act, taskId)
                    })

                    // 通用拖曳邏輯
                    const attachDrag = (el, type) => {
                        el.addEventListener('pointerdown', e => {
                            e.stopPropagation()
                            e.preventDefault()
                            el.setPointerCapture(e.pointerId)
                            // 設定 focus，同時隱藏 hover tooltip（drag tooltip 接管）
                            hoverTooltip.style.display = 'none'
                            this._focusedAct = act
                            this.setFocus(bar)

                            const startX    = e.clientX
                            const startY    = e.clientY
                            const startTop  = parseFloat(bar.style.top)
                            const startLeft = parseFloat(bar.style.left)
                            const startW    = parseFloat(bar.style.width)
                            const duration  = act.end.getTime() - act.start.getTime()
                            const minW      = SNAP_MS / msPerPx

                            // 記錄拖曳前的原始時間
                            const origStart = new Date(act.start)
                            const origEnd   = new Date(act.end)

                            // 追蹤目前拖曳位移（用於 tooltip 計算）
                            let currentDx = 0, currentDy = 0

                            // 建立幽靈 bar（move / resize 皆顯示預覽，bar 本身拖曳中不改變）
                            const liveDataArea = document.querySelector('.gantt_data_area')
                            let ghostBar = null
                            if (liveDataArea) {
                                ghostBar = document.createElement('div')
                                ghostBar.className = 'custom-act-bar-ghost'
                                ghostBar.style.cssText = `
                                    position:absolute;
                                    left:${startLeft}px;
                                    width:${startW}px;
                                    top:${startTop}px;
                                    height:${parseFloat(bar.style.height)}px;
                                    background:${typeColor};
                                    border:2px dashed ${typeBorder};
                                    opacity:0.5;
                                    z-index:6;
                                    pointer-events:none;
                                    border-radius:2px;
                                    box-sizing:border-box;
                                `
                                liveDataArea.appendChild(ghostBar)
                            }

                            if (type === 'move') bar.style.cursor = 'grabbing'

                            // 建立 tooltip（掛在 body，避免被 dataArea overflow 裁切）
                            const tooltip = document.createElement('div')
                            tooltip.className = 'drag-tooltip'
                            document.body.appendChild(tooltip)

                            const updateTooltip = () => {
                                // 拖曳中 bar 本身不改變，從原始值 + 位移計算當前預期位置
                                let curLeft, curW
                                if (type === 'move') {
                                    curLeft = snapPx(startLeft + currentDx)
                                    curW = startW
                                } else if (type === 'resize-right') {
                                    curLeft = startLeft
                                    curW = Math.max(snapPx(startLeft + startW + currentDx) - startLeft, minW)
                                } else {
                                    // resize-left
                                    curLeft = snapPx(startLeft + currentDx)
                                    curW = Math.max((startLeft + startW) - curLeft, minW)
                                }
                                
                                let newStart, newEnd

                                if (type === 'move') {
                                    const ns = isLeftClipped
                                        ? snapMs(origStart.getTime() + curLeft * msPerPx)
                                        : snapMs(timelineStart + curLeft * msPerPx)
                                    newStart = new Date(ns)
                                    newEnd   = new Date(ns + duration)
                                } else if (type === 'resize-right') {
                                    newStart = origStart
                                    // 右裁切：以 origEnd 為基準加上視覺位移量
                                    newEnd = isRightClipped
                                        ? new Date(snapMs(origEnd.getTime() + (curW - startW) * msPerPx))
                                        : new Date(snapMs(timelineStart + (curLeft + curW) * msPerPx))
                                } else if (type === 'resize-left') {
                                    // 左裁切：以 origStart 為基準加上視覺位移量（curLeft 從 0 起算，即相對 weekStart 的偏移）
                                    newStart = isLeftClipped
                                        ? new Date(snapMs(origStart.getTime() + curLeft * msPerPx))
                                        : new Date(snapMs(timelineStart + curLeft * msPerPx))
                                    newEnd = origEnd
                                }

                                // 使用 bar 的 viewport 座標定位（position:fixed）
                                const barRect = bar.getBoundingClientRect()
                                this.positionTooltip(tooltip, barRect, `項目: ${legendItem?.label ?? actType}  ${act.label}\n開始: ${this.fmtDt(newStart)}\n結束: ${this.fmtDt(newEnd)}`)
                            }

                            const onMove = ev => {
                                if (!el.hasPointerCapture(ev.pointerId)) return
                                const dx = ev.clientX - startX
                                const dy = ev.clientY - startY
                                
                                // 更新當前位移（供 updateTooltip 使用）
                                currentDx = dx
                                currentDy = dy

                                if (type === 'move') {
                                    // 拖曳中原 bar 不改位置，只由幽靈 bar 顯示預期最終位置
                                    
                                    // 更新幽靈 bar 位置（顯示預期最終位置）
                                    if (ghostBar) {
                                        // 根據滑鼠垂直位移判斷是否要跨列顯示
                                        const movedY = Math.abs(dy)
                                        if (movedY >= BASE_ROW_H * 0.5) {
                                            // 跨列顯示：幽靈 bar 顯示拖到的位置
                                            ghostBar.style.top = (startTop + dy) + 'px'
                                        } else {
                                            // 同列顯示：幽靈 bar 保持在起始 Y
                                            ghostBar.style.top = startTop + 'px'
                                        }
                                        ghostBar.style.left = snapPx(startLeft + dx) + 'px'
                                    }
                                } else if (type === 'resize-right') {
                                    if (ghostBar) {
                                        const newRight = snapPx(startLeft + startW + dx)
                                        ghostBar.style.width = Math.max(newRight - startLeft, minW) + 'px'
                                    }
                                } else if (type === 'resize-left') {
                                    if (ghostBar) {
                                        const newLeft = snapPx(startLeft + dx)
                                        const newW    = Math.max((startLeft + startW) - newLeft, minW)
                                        ghostBar.style.left  = newLeft + 'px'
                                        ghostBar.style.width = newW + 'px'
                                    }
                                }
                                updateTooltip()
                            }

                            updateTooltip()

                            const onUp = ev => {
                                if (!el.hasPointerCapture(ev.pointerId)) return
                                el.releasePointerCapture(ev.pointerId)
                                if (type === 'move') bar.style.cursor = 'grab'
                                tooltip.remove()

                                // 回寫資料
                                let finalLeft, finalW

                                if (type === 'move') {
                                    // move 拖曳中 bar 位置未改，使用預期最終位置
                                    finalLeft = snapPx(startLeft + currentDx)
                                    finalW = parseFloat(bar.style.width)
                                } else {
                                    finalLeft = parseFloat(bar.style.left)
                                    finalW = parseFloat(bar.style.width)
                                }
                                
                                if (type === 'move') {
                                    const ns = isLeftClipped
                                        ? snapMs(origStart.getTime() + finalLeft * msPerPx)
                                        : snapMs(timelineStart + finalLeft * msPerPx)
                                    act.start = new Date(ns)
                                    act.end   = new Date(ns + duration)

                                    // 判斷是否跨列（根據滑鼠垂直位移）
                                    const movedY = Math.abs(currentDy)
                                    let targetIdx = idx

                                    if (movedY >= BASE_ROW_H * 0.5) {
                                        // 足夠垂直位移，嘗試跨列
                                        const tentativeTop = startTop + currentDy
                                        const centerY = tentativeTop + (BASE_ROW_H - 8) / 2
                                        targetIdx = this.getTaskIndexAtY(centerY)
                                        if (targetIdx === -1) {
                                            let closestIdx = idx, closestDist = Infinity
                                            for (let i = 0; i < gantt.getTaskCount(); i++) {
                                                const dist = Math.abs(gantt.getRowTop(i) - tentativeTop)
                                                if (dist < closestDist) { closestDist = dist; closestIdx = i }
                                            }
                                            targetIdx = closestIdx
                                        }
                                    }
                                    const newTask = gantt.getTaskByIndex(targetIdx)

                                    if (newTask && newTask.id !== taskId) {
                                        // 跨列：更新 act 的 vessel/activity 資訊（act 仍在 ACTIVITIES 中，不需搬移）
                                        const srcOtherActs = getActsForTask(taskId).filter(a => a !== act)
                                        act.vesselPrefix   = newTask.vesselPrefix
                                        act.vesselName     = newTask.vesselName
                                        act.activityKey    = newTask.activityKey
                                        act.activityLabel  = newTask.activityLabel
                                        // 重新分道（跨列後兩列的 _lane 都需重算）
                                        if (srcOtherActs.length) assignLanes(srcOtherActs)   // 來源列無 draggedAct（act 已移走）
                                        assignLanes(getActsForTask(newTask.id), act)          // 目標列：act 排最後，其他 bar 優先
                                    } else {
                                        // 同列：act 排最後，非拖曳 bar 優先保留位置
                                        assignLanes(getActsForTask(taskId), act)
                                    }
                                    this.updateRowHeights()
                                    gantt.render()
                                } else if (type === 'resize-right') {
                                    act.end = isRightClipped
                                        ? new Date(snapMs(origEnd.getTime() + (finalW - startW) * msPerPx))
                                        : new Date(snapMs(timelineStart + (finalLeft + finalW) * msPerPx))
                                    assignLanes(getActsForTask(taskId), act)
                                    this.updateRowHeights()
                                    gantt.render()
                                } else if (type === 'resize-left') {
                                    act.start = isLeftClipped
                                        ? new Date(snapMs(origStart.getTime() + finalLeft * msPerPx))
                                        : new Date(snapMs(timelineStart + finalLeft * msPerPx))
                                    assignLanes(getActsForTask(taskId), act)
                                    this.updateRowHeights()
                                    gantt.render()
                                }

                                // 刪除幽靈 bar
                                if (ghostBar && ghostBar.parentNode) {
                                    ghostBar.parentNode.removeChild(ghostBar)
                                }

                                el.removeEventListener('pointermove', onMove)
                                el.removeEventListener('pointerup', onUp)
                            }

                            el.addEventListener('pointermove', onMove)
                            el.addEventListener('pointerup', onUp)
                        })
                    }

                    attachDrag(bar,     'move')
                    attachDrag(lHandle, 'resize-left')
                    attachDrag(rHandle, 'resize-right')

                    dataArea.appendChild(bar)
                })
            })
        })

        gantt.init(this.$refs.ganttEl)
        gantt.clearAll()

        // 依目前設定動態建立列，避免新增項目後沒有對應 row
        this.syncSettingsToGantt(getSettings(), { rebuildRows: true })

        // parse 後同步一次列高，確保 grid 與 timeline 都套用到最新 row_height
        this.updateRowHeights()
        gantt.render()

        // ── 拖拉平移時間軸（點擊空白區域才啟動）──
        let lastX = 0, lastY = 0
        const container = this.$refs.ganttEl

        container.addEventListener('pointerdown', e => {
            // 若點擊的是 bar 或縮放把手，不啟動 pan
            if (e.target.closest('.custom-act-bar')) return
            // 點擊空白區域，清除 focus
            this._focusedAct = null
            this.setFocus(null)
            container.setPointerCapture(e.pointerId)
            lastX = e.clientX
            lastY = e.clientY
            container.style.cursor = 'grabbing'
            e.preventDefault()
        }, { capture: true })

        container.addEventListener('pointermove', e => {
            if (!container.hasPointerCapture(e.pointerId)) return
            const dx = lastX - e.clientX
            const dy = lastY - e.clientY
            lastX = e.clientX
            lastY = e.clientY
            const state = gantt.getScrollState()
            if (state) gantt.scrollTo((state.x || 0) + dx, (state.y || 0) + dy)
        }, { capture: true })

        container.addEventListener('pointerup', e => {
            if (!container.hasPointerCapture(e.pointerId)) return
            container.releasePointerCapture(e.pointerId)
            container.style.cursor = ''
        }, { capture: true })
    },
    beforeDestroy() {
        // dhtmlx-gantt 是全域單例，離開頁面時需清除事件與資料，
        // 否則切換到其他 gantt 頁面可能互相污染導致畫面空白。
        if (typeof gantt.clearAll === 'function') gantt.clearAll()
        if (typeof gantt.detachAllEvents === 'function') gantt.detachAllEvents()
        if (this._hoverTooltip?.parentNode) this._hoverTooltip.parentNode.removeChild(this._hoverTooltip)
    },
    computed: {
        timeOptions() {
            const opts = []
            for (let h = 0; h < 24; h++) {
                opts.push(`${String(h).padStart(2,'0')}:00`)
                opts.push(`${String(h).padStart(2,'0')}:30`)
            }
            return opts
        },
        yearOptions() {
            const base = this.currentWeekStart ? this.currentWeekStart.getFullYear() : new Date().getFullYear()
            return [base - 2, base - 1, base, base + 1, base + 2]
        },
        weekOptions() {
            const total = this.getISOWeeksInYear(this.selectedYear)
            return Array.from({ length: total }, (_, i) => i + 1)
        },
        vesselOptions() {
            const settings = getSettings()
            return (settings.vessels || []).map(v => ({
                prefix: v.prefix,
                name: v.name,
                types: [...new Set((v.activities || []).map(a => a.key))]
            }))
        },
        availableTypes() {
            const vessel = this.vesselOptions.find(v => v.prefix === this.modalForm.vessel)
            if (!vessel) return []
            return vessel.types.map(key => ({
                key,
                label: this.legendData.find(l => l.key === key)?.label ?? key
            }))
        },
        deleteTargetLabel() {
            return this.pendingDeleteAct ? this.pendingDeleteAct.label : ''
        },
        deleteTargetItem() {
            if (!this.pendingDeleteAct) return ''
            const typeKey = this.pendingDeleteAct.activityKey
            const typeLabel = this.legendData.find(l => l.key === typeKey)?.label ?? typeKey
            return `${typeLabel} ${this.pendingDeleteAct.label}`.trim()
        },
        deleteTargetTimeRange() {
            if (!this.pendingDeleteAct) return ''
            const pad = n => String(n).padStart(2, '0')
            const fmt = dt => `${dt.getFullYear()}/${pad(dt.getMonth() + 1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
            return `${fmt(this.pendingDeleteAct.start)} ~ ${fmt(this.pendingDeleteAct.end)}`
        },
        weekLabel() {
            if (!this.currentWeekStart) return ''
            // ISO 週數計算
            const d = new Date(this.currentWeekStart)
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
            const week1 = new Date(d.getFullYear(), 0, 4)
            const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
            return `${this.currentWeekStart.getFullYear()} 年  第 ${weekNum} 週`
        }
    },
    methods: {
        openSettingsModal() {
            this.settingsModalVisible = true
        },
        closeSettingsModal() {
            this.settingsModalVisible = false
        },
        handleSettingsUpdate(newSettings) {
            // 更新時間間隔
            this.timeIntervalHours = newSettings.timeIntervalHours
            
            // 更新 Gantt 配置中的時間間隔
            gantt.config.scales[1].step = this.timeIntervalHours
            gantt.config.scales[1].format = date => {
                const pad = n => String(n).padStart(2, '0')
                const h1 = pad(date.getHours())
                const end = new Date(date.getTime() + this.timeIntervalHours * 60 * 60 * 1000)
                const h2 = pad(end.getHours())
                return `<div style="line-height:1.2">${h1}:00<br>${h2}:00</div>`
            }

            // 同步船隻/項目結構與顏色，並重建列資料
            this.syncSettingsToGantt(newSettings, { rebuildRows: true })
            
            this.updateRowHeights()
            gantt.render()
        },
        syncSettingsToGantt(newSettings, options = { rebuildRows: false }) {
            const vessels = newSettings.vessels || []

            const nextVessels = vessels.map(v => ({
                name: v.name,
                ids: (v.activities || []).map(a => `${v.prefix}_${a.key}`)
            }))
            VESSELS.splice(0, VESSELS.length, ...nextVessels)

            const validIds = new Set()
            vessels.forEach(v => {
                (v.activities || []).forEach(a => {
                    validIds.add(`${v.prefix}_${a.key}`)
                })
            })

            for (let i = ACTIVITIES.length - 1; i >= 0; i--) {
                const a = ACTIVITIES[i]
                if (!validIds.has(`${a.vesselPrefix}_${a.activityKey}`)) ACTIVITIES.splice(i, 1)
            }

            getTaskIds().forEach(id => assignLanes(getActsForTask(id)))

            const legendMap = new Map()
            vessels.forEach(v => {
                (v.activities || []).forEach(a => {
                    if (!legendMap.has(a.key)) {
                        legendMap.set(a.key, {
                            key: a.key,
                            label: a.label,
                            color: a.color,
                            border: a.border,
                        })
                    }
                })
            })
            this.legendData = Array.from(legendMap.values())

            window.TYPE_COLORS = {}
            this.legendData.forEach(item => {
                window.TYPE_COLORS[item.key] = { color: item.color, border: item.border }
            })

            if (options.rebuildRows) {
                this.rebuildRowsFromSettings(vessels)
            }
        },
        rebuildRowsFromSettings(vessels) {
            const rows = []
            vessels.forEach(v => {
                (v.activities || []).forEach(a => {
                    const taskId = `${v.prefix}_${a.key}`
                    const acts = getActsForTask(taskId)
                    const totalLanes = acts.length
                        ? Math.max(...acts.map(x => (x._lane ?? 0)), 0) + 1
                        : 1
                    rows.push({
                        id: taskId,
                        vesselPrefix: v.prefix,
                        vesselName: v.name,
                        activityKey: a.key,
                        activityLabel: a.label,
                        text: a.label,
                        isEmptyRow: true,
                        start_date: gantt.config.start_date,
                        end_date: gantt.config.end_date,
                        row_height: totalLanes * BASE_ROW_H,
                    })
                })
            })

            gantt.clearAll()
            gantt.parse({ data: rows, links: [] })
        },
        // ── 工具方法（從 mounted 閃住優抽出）──
        fmtDt(dt) {
            const p = n => String(n).padStart(2, '0')
            return `${dt.getFullYear()}/${p(dt.getMonth()+1)}/${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`
        },
        positionTooltip(tooltipEl, anchorRect, text) {
            const pad = 8
            tooltipEl.innerHTML = text
            tooltipEl.style.transform = 'none'
            tooltipEl.style.visibility = 'hidden'
            tooltipEl.style.display = 'block'
            const t = tooltipEl.getBoundingClientRect()
            let left = anchorRect.left + anchorRect.width / 2 - t.width / 2
            left = Math.max(pad, Math.min(left, window.innerWidth - t.width - pad))
            let top = anchorRect.top - t.height - pad
            if (top < pad) top = anchorRect.bottom + pad
            if (top + t.height > window.innerHeight - pad) {
                top = Math.max(pad, window.innerHeight - t.height - pad)
            }
            tooltipEl.style.left = `${Math.round(left)}px`
            tooltipEl.style.top = `${Math.round(top)}px`
            tooltipEl.style.visibility = 'visible'
        },
        applyFocusStyle(barEl) {
            barEl.dataset.savedBg       = barEl.style.backgroundColor || barEl.style.background || ''
            barEl.style.outline         = '2px solid #1a6fd4'
            barEl.style.outlineOffset   = '1px'
            barEl.style.backgroundColor = 'rgba(26,111,212,0.20)'
            barEl.style.zIndex          = '7'
            barEl.dataset.focused       = 'true'
        },
        removeFocusStyle(barEl) {
            barEl.style.outline         = ''
            barEl.style.outlineOffset   = ''
            barEl.style.backgroundColor = barEl.dataset.savedBg || ''
            delete barEl.dataset.savedBg
            delete barEl.dataset.focused
            barEl.style.zIndex          = '5'
        },
        setFocus(barEl) {
            document.querySelectorAll('.custom-act-bar[data-focused]').forEach(b => {
                this.removeFocusStyle(b)
            })
            if (barEl) this.applyFocusStyle(barEl)
        },
        updateRowHeights() {
            const wsMs = gantt.config.start_date.getTime()
            const weMs = gantt.config.end_date.getTime()
            VESSELS.forEach(({ ids }) => {
                ids.forEach(id => {
                    try { gantt.getTask(id).row_height = BASE_ROW_H } catch (e) { /* ignore */ }
                })
            })
            getTaskIds().forEach(taskId => {
                try {
                    const task = gantt.getTask(taskId)
                    const visActs = getActsForTask(taskId).filter(a =>
                        a.end.getTime() > wsMs && a.start.getTime() < weMs
                    )
                    const totalLanes = visActs.length
                        ? Math.max(...visActs.map(a => (a._lane ?? 0)), 0) + 1
                        : 1
                    task.row_height = totalLanes * BASE_ROW_H
                } catch (e) { /* task 尚未存在時忽略 */ }
            })
            VESSELS.forEach(({ ids }) => {
                const hasData = ids.some(id =>
                    getActsForTask(id).some(a =>
                        a.end.getTime() > wsMs && a.start.getTime() < weMs
                    )
                )
                if (!hasData) {
                    ids.forEach(id => {
                        try { gantt.getTask(id).row_height = 1 } catch (e) { /* ignore */ }
                    })
                }
            })
        },
        getTaskIndexAtY(y) {
            for (let i = 0; i < gantt.getTaskCount(); i++) {
                const top = gantt.getRowTop(i)
                const t = gantt.getTaskByIndex(i)
                const h = (t && t.row_height) || gantt.config.row_height
                if (y >= top && y < top + h) return i
            }
            return -1
        },
        getISOWeekInfo(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
            const dayNum = d.getUTCDay() || 7
            d.setUTCDate(d.getUTCDate() + 4 - dayNum)
            const isoYear = d.getUTCFullYear()
            const yearStart = new Date(Date.UTC(isoYear, 0, 1))
            const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
            return { year: isoYear, week }
        },
        getISOWeeksInYear(year) {
            return this.getISOWeekInfo(new Date(Date.UTC(year, 11, 28))).week
        },
        getISOWeekStart(year, week) {
            const jan4 = new Date(year, 0, 4)
            const jan4Day = jan4.getDay() || 7
            const mondayWeek1 = new Date(jan4)
            mondayWeek1.setDate(jan4.getDate() - jan4Day + 1)
            mondayWeek1.setHours(0, 0, 0, 0)
            const start = new Date(mondayWeek1)
            start.setDate(mondayWeek1.getDate() + (week - 1) * 7)
            return start
        },
        syncYearWeekFromWeekStart() {
            if (!this.currentWeekStart) return
            const info = this.getISOWeekInfo(this.currentWeekStart)
            this.selectedYear = info.year
            this.selectedWeek = info.week
        },
        onYearWeekChange() {
            const total = this.getISOWeeksInYear(this.selectedYear)
            if (this.selectedWeek > total) this.selectedWeek = total
            if (this.selectedWeek < 1) this.selectedWeek = 1
            this.currentWeekStart = this.getISOWeekStart(this.selectedYear, this.selectedWeek)
            this._applyWeek()
        },
        prevWeek() {
            const d = new Date(this.currentWeekStart)
            d.setDate(d.getDate() - 7)
            this.currentWeekStart = d
            this.syncYearWeekFromWeekStart()
            this._applyWeek()
        },
        nextWeek() {
            const d = new Date(this.currentWeekStart)
            d.setDate(d.getDate() + 7)
            this.currentWeekStart = d
            this.syncYearWeekFromWeekStart()
            this._applyWeek()
        },
        goToday() {
            const today = new Date()
            const dow = today.getDay()
            const daysToMon = dow === 0 ? 6 : dow - 1
            const mon = new Date(today)
            mon.setDate(today.getDate() - daysToMon)
            mon.setHours(0, 0, 0, 0)
            this.currentWeekStart = mon
            this.syncYearWeekFromWeekStart()
            this._applyWeek()
        },
        _applyWeek() {
            const ws = this.currentWeekStart
            const we = new Date(ws.getTime() + 7 * 86400000)
            gantt.config.start_date = ws
            gantt.config.end_date   = we
            getTaskIds().forEach(taskId => {
                try {
                    const task = gantt.getTask(taskId)
                    task.start_date = ws
                    task.end_date   = we
                } catch(e) {
                    console.log(`Task ${taskId} not found when applying week change`)
                }
            })
            // 切週後重算列高，避免保留上一週多分道撐高的 row_height
            this.updateRowHeights()
            gantt.render()
        },
        openAddModal() {
            this.modalMode = 'add'
            this.modalForm = { vessel: '', type: '', label: '', startDate: '', startTime: '00:00', endDate: '', endTime: '00:00' }
            this.editTaskId = null
            this.editAct = null
            this.modalVisible = true
        },
        openEditModal(act, taskId) {
            this.modalMode = 'edit'
            this.editTaskId = taskId
            this.editAct = act
            const vessel = act.vesselPrefix
            const type   = act.activityKey
            const pad = n => String(n).padStart(2, '0')
            this.modalForm = {
                vessel, type,
                label:     act.label,
                startDate: `${act.start.getFullYear()}-${pad(act.start.getMonth()+1)}-${pad(act.start.getDate())}`,
                startTime: `${pad(act.start.getHours())}:${act.start.getMinutes() < 30 ? '00' : '30'}`,
                endDate:   `${act.end.getFullYear()}-${pad(act.end.getMonth()+1)}-${pad(act.end.getDate())}`,
                endTime:   `${pad(act.end.getHours())}:${act.end.getMinutes() < 30 ? '00' : '30'}`,
            }
            this.modalVisible = true
        },
        closeModal() {
            this.modalVisible = false
        },
        saveModal() {
            const f = this.modalForm
            if (!f.vessel || !f.type || !f.label || !f.startDate || !f.startTime || !f.endDate || !f.endTime) {
                alert('請填寫所有欄位')
                return
            }
            const newStart = new Date(`${f.startDate}T${f.startTime}`)
            const newEnd   = new Date(`${f.endDate}T${f.endTime}`)
            if (isNaN(newStart) || isNaN(newEnd)) { alert('時間格式錯誤'); return }
            if (newEnd <= newStart) { alert('結束時間必須晚於開始時間'); return }
            const newTaskId = `${f.vessel}_${f.type}`
            const newVesselName    = getSettings().vessels.find(v => v.prefix === f.vessel)?.name ?? f.vessel
            const newActivityLabel = getSettings().vessels.find(v => v.prefix === f.vessel)?.activities.find(a => a.key === f.type)?.label ?? f.type
            if (this.modalMode === 'add') {
                const act = { vesselPrefix: f.vessel, vesselName: newVesselName, activityKey: f.type, activityLabel: newActivityLabel, label: f.label, start: newStart, end: newEnd }
                ACTIVITIES.push(act)
                assignLanes(getActsForTask(newTaskId))
            } else {
                const oldTaskId = this.editTaskId
                const act = this.editAct
                if (oldTaskId !== newTaskId) {
                    const oldOtherActs = getActsForTask(oldTaskId).filter(a => a !== act)
                    act.vesselPrefix = f.vessel; act.vesselName = newVesselName
                    act.activityKey = f.type; act.activityLabel = newActivityLabel
                    act.label = f.label; act.start = newStart; act.end = newEnd
                    if (oldOtherActs.length) assignLanes(oldOtherActs)
                    assignLanes(getActsForTask(newTaskId))
                } else {
                    act.label = f.label; act.start = newStart; act.end = newEnd
                    assignLanes(getActsForTask(newTaskId), act)
                }
            }
            this.updateRowHeights()
            gantt.render()
            this.closeModal()
        },
        openContextMenu(e, act, taskId) {
            this.contextMenu = { visible: true, x: e.clientX, y: e.clientY, act, taskId }
        },
        hideContextMenu() {
            this.contextMenu.visible = false
        },
        requestDelete(act, taskId) {
            this.pendingDeleteAct = act
            this.pendingDeleteTaskId = taskId
            this.deleteConfirmVisible = true
        },
        cancelDelete() {
            this.deleteConfirmVisible = false
            this.pendingDeleteAct = null
            this.pendingDeleteTaskId = null
        },
        confirmDelete() {
            if (!this.pendingDeleteAct || !this.pendingDeleteTaskId) {
                this.cancelDelete()
                return
            }
            this.deleteAct(this.pendingDeleteAct, this.pendingDeleteTaskId)
            this.cancelDelete()
        },
        deleteAct(act, taskId) {
            const i = ACTIVITIES.indexOf(act); if (i !== -1) ACTIVITIES.splice(i, 1)
            const remaining = getActsForTask(taskId)
            if (remaining.length) assignLanes(remaining)
            this.updateRowHeights()
            gantt.render()
        },
    }
}
</script>

<style>
/* hoverTooltip 與 drag tooltip 掛在 body 上，無法使用 scoped，需要全域樣式 */
.plan-gantt-hover-tooltip {
    position: fixed;
    background: rgba(30, 30, 30, 0.82);
    color: #fff;
    font-size: 16px;
    padding: 6px 12px;
    border-radius: 4px;
    white-space: pre;
    pointer-events: none;
    z-index: 9998;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
    display: none;
}

.drag-tooltip {
    position: fixed;
    background: rgba(30, 30, 30, 0.82);
    color: #fff;
    font-size: 16px;
    padding: 6px 12px;
    border-radius: 4px;
    white-space: pre;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
}
</style>

<style lang="scss" scoped>

.plan-gantt-wrapper {
    width: 100%;
    height: fit-content;
    max-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
}

.plan-gantt-legend {
    display: flex;
    gap: 20px;
    padding: 12px 16px;
    background: $color-bg-subtle;
    border-bottom: 1px solid $color-border-medium;
    flex-wrap: wrap;
    align-items: center;
}

.nav-label {
    font-size: 0.9375em;
    font-weight: 600;
    color: $color-text-subtle;
    min-width: 160px;
    text-align: center;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125em;
}

.legend-swatch {
    width: 20px;
    height: 20px;
    border: 2px solid;
    border-radius: 2px;
    flex-shrink: 0;
}

.legend-label {
    color: $color-text;
    font-weight: 500;
}

.plan-gantt {
    width: 100%;
    height: fit-content;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    flex: 1;
}

:deep(.hidden-bar) { display: none !important; }

:deep(.gantt-row-hidden) {
    height: 0 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    border-bottom: none !important;
    padding: 0 !important;
}

/* 資料列文字向右偏移，避免被 vessel overlay 蓋住 */
:deep(.gantt_grid_data .gantt_row .gantt_cell) {
    padding-left: 0 !important;
}

/* 只偏移文字內容，保留 dhtmlx 原生 tree/子項目縮排 */
:deep(.gantt_tree_content) {
    margin-left: 52px;
}

/* 表頭：向右偏移並確保左側背景為白色 */
:deep(.gantt_grid_head_cell) {
    padding: 0 26px !important;
    background: $color-white !important;
}

:deep(.gantt_task_cell.day-start) {
    border-left: 1px solid $color-text-hint !important;
}

/* ── Vessel label overlay ── */
:deep(.vessel-label-overlay) {
    position: absolute;
    left: 0;
    width: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    font-weight: bold;
    font-size: 13px;
    background-color: #e8f0f8;
    border-right: 1px solid #b0c4de;
    border-bottom: 2px solid #7a9abf;
    z-index: 10;
    pointer-events: none;
    box-sizing: border-box;
}

:deep(.custom-act-bar) {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15em;
    font-weight: 900;
    overflow: visible;
    white-space: nowrap;
    box-sizing: border-box;
    cursor: grab;
    user-select: none;
    z-index: 5;
    border-radius: 5px;
    transition: box-shadow 0.12s;
}

/* ghost bar：覆蓋部分 custom-act-bar 樣式 */
:deep(.custom-act-bar-ghost) {
    border-radius: 2px;
    opacity: 0.5;
    pointer-events: none;
    z-index: 4;
}

/* bar 內文字標籤 */
:deep(.bar-label) {
    pointer-events: none;
    overflow: hidden;
    white-space: nowrap;
    font-weight: 900;
}

/* 跨週箭頭 */
:deep(.bar-arrow) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    pointer-events: none;
    z-index: 6;
}

:deep(.bar-arrow--left) {
    left: 3px;
    border-right: 9px solid var(--bar-border-color);
}

:deep(.bar-arrow--right) {
    right: 3px;
    border-left: 9px solid var(--bar-border-color);
}

/* 縮放把手：平時寬度縮小，hover 時才擴展 */
:deep(.bar-resize-handle) {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    z-index: 7;
    transition: width 0.1s;
}

:deep(.bar-resize-left) {
    left: 0;
    cursor: w-resize;
}

:deep(.bar-resize-right) {
    right: 0;
    cursor: e-resize;
}

:deep(.custom-act-bar:hover .bar-resize-handle) {
    width: 8px;
}

/* 跨週裁切指示器：裁切側移除邊框與圓角 */
:deep(.custom-act-bar.bar-left-clipped) {
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

:deep(.custom-act-bar.bar-right-clipped) {
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

/* ── 右鍵選單 ── */
.context-menu {
    position: fixed;
    background: $color-white;
    border: 1px solid $color-border-medium;
    border-radius: 6px;
    box-shadow: $context-shadow;
    z-index: 10000;
    min-width: 120px;
    overflow: hidden;
    padding: 4px 0;
}
.context-menu-item {
    padding: 9px 18px;
    font-size: 0.9375em;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: $color-bg-menu-hover; }
    &--danger { color: $color-danger;
        &:hover { background: $color-bg-danger-menu; }
    }
}

.modal-dialog {
    width: 420px;
}
.modal-body {
    gap: 14px;
}

.form-row {
    label {
        width: 72px;
    }
}

.delete-confirm-dialog {
    width: 360px;
}
.delete-confirm-body {
    font-size: 0.95em;
    color: $color-text;
}
.delete-info-line {
    margin-top: 8px;
    line-height: 1.5;
}
</style>
