<template>
    <div class="dhtmlx-gantt-wrapper">
        <div class="plan-gantt-nav">
            <span class="nav-timeinterval">單位時間: {{ timeIntervalHours }} 小時/格</span>
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
        </div>

        <div class="dhtmlx-gantt" :class="{ 'loading-state': isLoading }">
            <div ref="dhtmlxGantt" class="dhtmlx-gantt-host" v-show="!hasNoWeekData" style="width: 100%;"></div>
            <div v-if="hasNoWeekData && !isLoading" class="no-data-panel">
                <span>暫無資料</span>
            </div>
            <transition name="loading-fade">
                <div v-if="isLoading" class="gantt-loading-overlay">
                    <div class="gantt-spinner"></div>
                </div>
            </transition>
        </div>

        <!-- 設定 Modal -->
        <transition name="modal-fade">
            <div v-if="settingsVisible" class="modal-overlay" @click.self="settingsVisible = false">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <span>甘特圖設定</span>
                        <button class="modal-close" @click="settingsVisible = false">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <label>時間間隔（小時）</label>
                            <select v-model.number="settingsForm.timeIntervalHours">
                                <option :value="1">1 小時</option>
                                <option :value="2">2 小時</option>
                                <option :value="3">3 小時</option>
                                <option :value="4">4 小時</option>
                                <option :value="6">6 小時</option>
                                <option :value="8">8 小時</option>
                                <option :value="12">12 小時</option>
                                <option :value="24">24 小時</option>
                            </select>
                            <span class="form-hint">（當前：{{ timeIntervalHours }} 小時/格）</span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" @click="settingsVisible = false">取消</button>
                        <button class="btn-save" @click="saveSettings">儲存設定</button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- 新增 Modal -->
        <transition name="modal-fade">
            <div v-if="addVisible" class="modal-overlay" @click.self="addVisible = false">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <span>新增泊位活動</span>
                        <button class="modal-close" @click="addVisible = false">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <label>區域</label>
                            <select v-model="addForm.section" @change="addForm.berth = ''">
                                <option value="">請選擇</option>
                                <option v-for="s in sectionOptions" :key="s.prefix" :value="s.prefix">{{ s.name }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>泊位</label>
                            <select v-model="addForm.berth" :disabled="!addForm.section">
                                <option value="">請選擇</option>
                                <option v-for="n in berthOptions" :key="n" :value="String(n)">{{ n }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>標籤</label>
                            <input type="text" v-model="addForm.barLabel" placeholder="請輸入標籤" />
                        </div>
                        <div class="form-row">
                            <label>開始時間</label>
                            <input type="date" v-model="addForm.startDate" />
                            <select v-model="addForm.startTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>結束時間</label>
                            <input type="date" v-model="addForm.endDate" />
                            <select v-model="addForm.endTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" @click="addVisible = false">取消</button>
                        <button class="btn-save" @click="saveAdd">儲存</button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import { berthApiService } from '@/api/BerthApiService'

const SECTIONS = [
    { name: '碼頭',  prefix: 'w', ids: ['w1','w2','w3','w4','w5','w6','w7','w8','w9','w10'], color: '#a8c8e8', borderColor: '#4a90c4' },
    { name: '浮桶',  prefix: 'b', ids: ['b1','b2','b3','b4','b5'],                            color: '#e8b87a', borderColor: '#c07030' },
    { name: '錨地',  prefix: 'a', ids: ['a1','a2','a3','a4','a5'],                            color: '#f0b0c8', borderColor: '#c03070' },
    { name: '油駁船', prefix: 't', ids: ['t1','t2','t3'],                                      color: '#c03030', borderColor: '#900000' },
]

const ROW_STYLES = {
    berth: { color: '#a8c8e8', borderColor: '#4a90c4' },
    buoy: { color: '#e8b87a', borderColor: '#c07030' },
    anchorage: { color: '#f0b0c8', borderColor: '#c03070' },
    barge: { color: '#f6c2c2', borderColor: '#900000' },
}

const ROW_TYPE_META = {
    berth: { label: '碼頭', order: 1 },
    buoy: { label: '浮桶', order: 2 },
    anchorage: { label: '錨位', order: 3 },
    barge: { label: '油泊船', order: 4 },
}

export default {
    name: 'DhtmlxGantt',
    data() {
        return {
            currentWeekStart: null,
            selectedYear: new Date().getFullYear(),
            selectedWeek: 1,
            apiReadOnly: true,
            hasNoWeekData: true,
            apiLoadFailed: false,
            isLoading: false,
            blockedRanges: [
                { start: new Date(2025, 8, 30, 0, 0), end: new Date(2025, 9, 1, 0, 0) }
            ],
            timeIntervalHours: 6,
            // 活動資料（對應後端 GET /api/berth-activities 回傳）
            activities: [],
            // 設定 Modal
            settingsVisible: false,
            settingsForm: { timeIntervalHours: 6 },
            // 新增 Modal
            addVisible: false,
            addForm: {
                section: '', berth: '', barLabel: '',
                startDate: '', startTime: '00:00',
                endDate:   '', endTime:   '00:00',
            },
        }
    },
    computed: {
        yearOptions() {
            const base = this.currentWeekStart
                ? this.currentWeekStart.getFullYear()
                : new Date().getFullYear()
            return [base - 2, base - 1, base, base + 1, base + 2]
        },
        weekOptions() {
            const total = this.getISOWeeksInYear(this.selectedYear)
            return Array.from({ length: total }, (_, i) => i + 1)
        },
        timeOptions() {
            const opts = []
            for (let h = 0; h < 24; h++) {
                opts.push(`${String(h).padStart(2,'0')}:00`)
                opts.push(`${String(h).padStart(2,'0')}:30`)
            }
            return opts
        },
        sectionOptions() {
            return SECTIONS.map(s => ({ prefix: s.prefix, name: s.name, count: s.ids.length }))
        },
        berthOptions() {
            if (!this.addForm.section) return []
            const sec = SECTIONS.find(s => s.prefix === this.addForm.section)
            return sec ? Array.from({ length: sec.ids.length }, (_, i) => i + 1) : []
        },
    },
    methods: {
        showReadOnlyNotice() {
            alert('目前 API 為唯讀（僅支援 GET），無法新增或編輯資料。')
        },
        extractRows(payload) {
            if (Array.isArray(payload)) return payload
            if (Array.isArray(payload?.data)) return payload.data
            return []
        },
        parseValidDate(value) {
            if (value == null || value === '') return null
            const dt = new Date(value)
            return isNaN(dt) ? null : dt
        },
        getActivityRowInfo(activity) {
            const berthIdRaw = activity?.berthId
            const berthId = berthIdRaw == null ? '' : String(berthIdRaw).trim()

            // 業務規則：berthId 與 actEnd 同時為 null 時視為錨地資料
            if (activity?.berthId == null && activity?.actEnd == null) {
                return { rowId: 'anchorage', rowText: '錨地', rowType: 'anchorage' }
            }

            // 業務規則：40 開頭且 4 位數為浮桶，其餘視為一般碼頭
            const isBuoy = /^40\d{2}$/.test(berthId)
            if (isBuoy) {
                return { rowId: `buoy:${berthId}`, rowText: berthId, rowType: 'buoy' }
            }
            return { rowId: `berth:${berthId}`, rowText: berthId, rowType: 'berth' }
        },
        getBargeRowInfo(rawId) {
            const id = String(rawId).trim()
            if (!id) return null
            return { rowId: `barge:${id}`, rowText: id, rowType: 'barge' }
        },
        buildBarLabel(item) {
            const fuelParts = []
            if (item.MFO180) fuelParts.push(`MFO180 ${item.MFO180}`)
            if (item.MFO380) fuelParts.push(`MFO380 ${item.MFO380}`)
            if (item.MGO) fuelParts.push(`MGO ${item.MGO}`)
            const fuelText = fuelParts.join(' ')
            return `${item.ship || ''}${fuelText ? ' ' + fuelText : ''}`.trim() || '未命名'
        },
        mapBerthActivitiesResponse(rows) {
            const mapped = []
            let anchorageIndex = 0
            rows.forEach((item, rowIndex) => {
                const label = this.buildBarLabel(item)
                const acts = Array.isArray(item.activity) ? item.activity : []

                acts.forEach((a, actIndex) => {
                    let rowInfo = this.getActivityRowInfo(a)
                    if (!rowInfo?.rowId) return

                    if (rowInfo.rowType === 'anchorage') {
                        anchorageIndex += 1
                        rowInfo = {
                            rowId: `anchorage:${anchorageIndex}`,
                            rowText: String(anchorageIndex),
                            rowType: 'anchorage',
                        }
                    }

                    const actStart = this.parseValidDate(a?.actStart)
                    const actEnd = this.parseValidDate(a?.actEnd)

                    // 錨地資料可能無 actEnd，只保留 row 顯示，不繪製 bar
                    const isAnchoragePlaceholder = rowInfo.rowType === 'anchorage' && actStart && !actEnd
                    if (!isAnchoragePlaceholder) {
                        if (!actStart || !actEnd || actEnd <= actStart) return
                    }

                    mapped.push({
                        // 前端內部欄位
                        id: `api_${rowIndex}_${actIndex}`,
                        rowId: rowInfo.rowId,
                        rowText: rowInfo.rowText,
                        rowType: rowInfo.rowType,
                        barLabel: label,
                        actStart,
                        actEnd,
                        isAnchoragePlaceholder,
                        // 保留 API 原始欄位，方便 tooltip/除錯
                        sourceShip: item.ship || '',
                        sourceMFO180: item.MFO180 || 0,
                        sourceMFO380: item.MFO380 || 0,
                        sourceMGO: item.MGO || 0,
                        sourceBerthId: a.berthId == null ? '' : String(a.berthId),
                        sourceActStart: a.actStart,
                        sourceActEnd: a.actEnd,
                    })
                })
            })
            return mapped
        },
        mapBlockedRangesResponse(rows) {
            return rows
                .map(r => {
                    const start = this.parseValidDate(r.start)
                    const end = this.parseValidDate(r.end)
                    const normalizedType = r.type || 'site'
                    const appliesToAllRows = normalizedType === 'site'
                    const appliesToAllBarge = normalizedType === 'barge' && (r.id == null || String(r.id).trim() === '')
                    const bargeInfo = r.type === 'barge' && !appliesToAllBarge && r.id != null
                        ? this.getBargeRowInfo(r.id)
                        : null
                    return {
                        // 前端內部欄位
                        start,
                        end,
                        appliesToAllRows,
                        appliesToAllBarge,
                        targetRowId: bargeInfo?.rowId || null,
                        targetRowText: bargeInfo?.rowText || '',
                        // API 原始欄位
                        type: normalizedType,
                        category: r.category || '',
                        sourceId: r.id || null,
                    }
                })
                .filter(r => {
                    if (!r.start || !r.end || r.end <= r.start) return false
                    if (r.type === 'site') return true
                    if (r.type === 'barge') return r.appliesToAllBarge || !!r.targetRowId
                    return false
                })
        },
        isBlockedRangeApplicableToTask(range, task) {
            if (range.appliesToAllRows) return true
            if (task?.row_type !== 'barge') return false
            if (range.appliesToAllBarge) return true
            return !!(task?.id && range.targetRowId === task.id)
        },
        getBlockedSegmentsForCell(task, cellStartMs, cellEndMs) {
            const segments = []
            for (const r of this.blockedRanges) {
                if (!this.isBlockedRangeApplicableToTask(r, task)) continue
                const overlapStart = Math.max(cellStartMs, r.start.getTime())
                const overlapEnd = Math.min(cellEndMs, r.end.getTime())
                if (overlapEnd <= overlapStart) continue
                segments.push([overlapStart, overlapEnd])
            }
            if (!segments.length) return []

            segments.sort((a, b) => a[0] - b[0])
            const merged = [segments[0]]
            for (let i = 1; i < segments.length; i++) {
                const prev = merged[merged.length - 1]
                const cur = segments[i]
                if (cur[0] <= prev[1]) {
                    prev[1] = Math.max(prev[1], cur[1])
                } else {
                    merged.push(cur)
                }
            }
            return merged
        },
        buildBlockedCellGradient(task, cellStartMs, cellEndMs) {
            const duration = cellEndMs - cellStartMs
            if (duration <= 0) return ''

            const segments = this.getBlockedSegmentsForCell(task, cellStartMs, cellEndMs)
            if (!segments.length) return ''

            const toPct = value => Math.max(0, Math.min(100, ((value - cellStartMs) / duration) * 100))
            const parts = []
            let cursor = 0

            for (const [start, end] of segments) {
                const s = toPct(start)
                const e = toPct(end)
                if (s > cursor) {
                    parts.push(`transparent ${cursor}% ${s}%`)
                }
                parts.push(`rgba(200, 30, 30, 0.14) ${s}% ${e}%`)
                cursor = e
            }

            if (cursor < 100) {
                parts.push(`transparent ${cursor}% 100%`)
            }

            return `linear-gradient(to right, ${parts.join(', ')})`
        },
        getVisibleBerthIdSet() {
            const visible = new Map()
            this.activities.forEach(act => {
                if (act?.rowId && act?.rowText) {
                    visible.set(act.rowId, {
                        id: act.rowId,
                        text: act.rowText,
                        row_type: act.rowType || 'berth',
                    })
                }
            })

            this.blockedRanges.forEach(r => {
                if (r?.targetRowId) {
                    visible.set(r.targetRowId, {
                        id: r.targetRowId,
                        text: r.targetRowText || String(r.sourceId || ''),
                        row_type: 'barge',
                    })
                }
            })

            return visible
        },
        buildVisibleBerthRows() {
            const rows = Array.from(this.getVisibleBerthIdSet().values())
            return rows
                .sort((a, b) => {
                    const orderA = ROW_TYPE_META[a.row_type]?.order || 99
                    const orderB = ROW_TYPE_META[b.row_type]?.order || 99
                    if (orderA !== orderB) return orderA - orderB
                    return a.text.localeCompare(b.text, 'zh-Hant')
                })
                .map(r => ({
                id: r.id,
                text: r.text,
                row_type: r.row_type,
                start_date: new Date(2020, 0, 1),
                end_date: new Date(2030, 11, 31),
            }))
        },
        rebuildGanttRows() {
            const rows = this.buildVisibleBerthRows()
            this.hasNoWeekData = this.apiLoadFailed || rows.length === 0
            gantt.config.autosize = 'y'
            gantt.clearAll()
            gantt.parse({
                data: rows,
                links: [],
            })
            gantt.setSizes()
        },
        async loadActivitiesFromApi() {
            try {
                const res = await berthApiService.getBerthActivities()
                const rows = this.extractRows(res)
                this.activities = this.mapBerthActivitiesResponse(rows)
            } catch (err) {
                this.apiLoadFailed = true
                console.error('載入 berth-activities 失敗：', err)
                this.activities = []
            }
        },
        async loadBlockedRangesFromApi() {
            try {
                const res = await berthApiService.getBlockedRanges()
                const rows = this.extractRows(res)
                this.blockedRanges = this.mapBlockedRangesResponse(rows)
            } catch (err) {
                this.apiLoadFailed = true
                console.error('載入 blocked-ranges 失敗：', err)
                this.blockedRanges = []
            }
        },
        async loadWeekData() {
            this.apiLoadFailed = false
            this.isLoading = true
            try {
                await Promise.all([
                    this.loadActivitiesFromApi(),
                    this.loadBlockedRangesFromApi(),
                ])
            } finally {
                this.isLoading = false
            }
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
        async onYearWeekChange() {
            const total = this.getISOWeeksInYear(this.selectedYear)
            if (this.selectedWeek > total) this.selectedWeek = total
            if (this.selectedWeek < 1) this.selectedWeek = 1
            this.currentWeekStart = this.getISOWeekStart(this.selectedYear, this.selectedWeek)
            await this._applyWeek()
        },
        async prevWeek() {
            const d = new Date(this.currentWeekStart)
            d.setDate(d.getDate() - 7)
            this.currentWeekStart = d
            this.syncYearWeekFromWeekStart()
            await this._applyWeek()
        },
        async nextWeek() {
            const d = new Date(this.currentWeekStart)
            d.setDate(d.getDate() + 7)
            this.currentWeekStart = d
            this.syncYearWeekFromWeekStart()
            await this._applyWeek()
        },
        async goToday() {
            const today = new Date()
            const dow = today.getDay()
            const daysToMon = dow === 0 ? 6 : dow - 1
            const mon = new Date(today)
            mon.setDate(today.getDate() - daysToMon)
            mon.setHours(0, 0, 0, 0)
            this.currentWeekStart = mon
            this.syncYearWeekFromWeekStart()
            await this._applyWeek()
        },
        async _applyWeek() {
            const ws = this.currentWeekStart
            const we = new Date(ws.getTime() + 7 * 86400000)
            gantt.config.start_date = ws
            gantt.config.end_date   = we
            await this.loadWeekData()
            this.rebuildGanttRows()
            gantt.render()
            this.$nextTick(() => gantt.setSizes())
        },
        // ── 設定 Modal ──
        openSettingsModal() {
            this.settingsForm = { timeIntervalHours: this.timeIntervalHours }
            this.settingsVisible = true
        },
        saveSettings() {
            this.timeIntervalHours = this.settingsForm.timeIntervalHours
            gantt.config.scales[1].step = this.timeIntervalHours
            gantt.render()
            this.settingsVisible = false
        },
        // ── 新增 Modal ──
        openAddModal() {
            const today = this.currentWeekStart || new Date()
            const pad = n => String(n).padStart(2, '0')
            const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
            this.addForm = {
                section: '', berth: '', barLabel: '',
                startDate: fmt(today), startTime: '08:00',
                endDate:   fmt(today), endTime:   '17:00',
            }
            this.addVisible = true
        },
        saveAdd() {
            if (this.apiReadOnly) {
                this.showReadOnlyNotice()
                return
            }
            const f = this.addForm
            if (!f.section || !f.berth || !f.startDate || !f.endDate) {
                alert('請填寫所有必填欄位')
                return
            }
            const start = new Date(`${f.startDate}T${f.startTime}`)
            const end   = new Date(`${f.endDate}T${f.endTime}`)
            if (isNaN(start) || isNaN(end)) {
                alert('時間格式錯誤')
                return
            }
            if (end <= start) {
                alert('結束時間必須晚於開始時間')
                return
            }
            // 新增活動至 activities（串接後端時改為 POST /api/berth-activities）
            this.activities.push({
                id:       `act_${Date.now()}`,
                berthId:  f.section + f.berth,
                barLabel: f.barLabel,
                actStart: start,
                actEnd:   end,
            })
            gantt.render()
            this.addVisible = false
        },
        fmtDt(dt) {
            const p = n => String(n).padStart(2, '0')
            return `${dt.getFullYear()}/${p(dt.getMonth()+1)}/${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`
        },
        positionTooltip(tooltipEl, anchorRect, text) {
            const pad = 8
            tooltipEl.innerHTML = text.replace(/\n/g, '<br>')
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
    },
    created() {
        // ── 初始週範圍（以今日為基準）──
        const today = new Date()
        const dow = today.getDay()
        const daysToMon = dow === 0 ? 6 : dow - 1
        const initStart = new Date(today)
        initStart.setDate(today.getDate() - daysToMon)
        initStart.setHours(0, 0, 0, 0)
        this.currentWeekStart = initStart
        this.syncYearWeekFromWeekStart()

        // ── Gantt 靜態設定 ──
        const DOW = ['日', '一', '二', '三', '四', '五', '六']
        gantt.config.columns = [
            { name: 'text', label: '泊位', width: 100, align: 'center' },
        ]
        gantt.config.scales = [
            {
                unit: 'day', step: 1,
                format: date =>
                    `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} (${DOW[date.getDay()]})`
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
        gantt.config.start_date  = this.currentWeekStart
        gantt.config.end_date    = new Date(this.currentWeekStart.getTime() + 7 * 86400000)
        gantt.config.show_progress  = false
        gantt.config.readonly       = true
        gantt.config.column_width   = 60
        gantt.config.scale_height   = 70
        gantt.config.row_height     = 35
        gantt.config.autosize       = 'y'

        // ── Task 樣式：全部隱藏預設 bar，改在 onGanttRender 手動繪製 ──
        gantt.templates.task_class = () => 'hidden-bar'
        gantt.templates.task_text  = () => ''
        gantt.templates.timeline_cell_class = (task, date) => {
            const classes = []
            const cellStartMs = date.getTime()
            const cellEndMs = cellStartMs + (this.timeIntervalHours * 60 * 60 * 1000)
            const hasBlocked = this.getBlockedSegmentsForCell(task, cellStartMs, cellEndMs).length > 0

            if (hasBlocked) {
                classes.push('blocked-period')
            }
            if (date.getHours() === 0) classes.push('day-start')
            return classes.join(' ')
        }
        gantt.templates.timeline_cell_content = (task, date) => {
            const cellStartMs = date.getTime()
            const cellEndMs = cellStartMs + (this.timeIntervalHours * 60 * 60 * 1000)
            const gradient = this.buildBlockedCellGradient(task, cellStartMs, cellEndMs)
            if (!gradient) return ''
            return `<div class="blocked-cell-overlay" style="background:${gradient};"></div>`
        }
    },
    async mounted() {
        // ── Hover tooltip（掛在 body，避免被 gantt_data_area overflow 裁切）──
        const hoverTooltip = this._hoverTooltip = document.createElement('div')
        hoverTooltip.style.cssText = `
            position:fixed;
            background:rgba(30,30,30,0.82);
            color:#fff;
            font-size:14px;
            padding:6px 12px;
            border-radius:4px;
            white-space:pre;
            pointer-events:none;
            z-index:9998;
            box-shadow:0 2px 6px rgba(0,0,0,0.28);
            display:none;
        `
        document.body.appendChild(hoverTooltip)

        // ── Section label overlay + 手動繪製 activity bar ──
        gantt.attachEvent('onGanttRender', () => {
            const ganttRoot = this.$refs.dhtmlxGantt
            if (!ganttRoot) return

            // ── Section overlay（依可見列動態顯示：碼頭/錨位/浮桶/油泊船）──
            ganttRoot.querySelectorAll('.section-label-overlay').forEach(el => el.remove())
            const gridData = ganttRoot.querySelector('.gantt_grid_data')
            if (gridData) {
                const groups = []
                for (let i = 0; i < gantt.getVisibleTaskCount(); i++) {
                    const task = gantt.getTaskByIndex(i)
                    const rowType = task?.row_type || 'berth'
                    const last = groups[groups.length - 1]
                    if (!last || last.rowType !== rowType) {
                        groups.push({ rowType, startIndex: i, count: 1 })
                    } else {
                        last.count += 1
                    }
                }

                groups.forEach(group => {
                    const meta = ROW_TYPE_META[group.rowType]
                    if (!meta) return
                    const top = gantt.getRowTop(group.startIndex)
                    const height = gantt.config.row_height * group.count

                    const el = document.createElement('div')
                    el.className = 'section-label-overlay'
                    el.textContent = meta.label
                    Object.assign(el.style, {
                        position:       'absolute',
                        left:           '0',
                        top:            `${top}px`,
                        width:          '50px',
                        height:         `${height}px`,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        writingMode:    'vertical-rl',
                        fontWeight:     'bold',
                        fontSize:       '13px',
                        backgroundColor:'#e8f0f8',
                        borderRight:    '1px solid #b0c4de',
                        borderBottom:   '2px solid #7a9abf',
                        zIndex:         '10',
                        pointerEvents:  'none',
                        boxSizing:      'border-box',
                    })
                    gridData.appendChild(el)
                })
            }

            // ── 手動繪製 activity bar（資料來源：this.activities）──
            ganttRoot.querySelectorAll('.custom-act-bar').forEach(el => el.remove())
            const barsArea = ganttRoot.querySelector('.gantt_data_area')
            if (!barsArea) return

            if (this.hasNoWeekData) return

            const wsMs = gantt.config.start_date.getTime()
            const weMs = gantt.config.end_date.getTime()
            const rh   = gantt.config.row_height

            this.activities.forEach(act => {
                if (!act.actStart) return
                const s = act.actStart.getTime()
                const e = act.actEnd ? act.actEnd.getTime() : null
                if (!act.isAnchoragePlaceholder) {
                    if (!e) return
                    if (e <= wsMs || s >= weMs) return // 活動完全在視窗外，不畫
                } else {
                    if (s < wsMs || s >= weMs) return
                }

                const idx = gantt.getTaskIndex(act.rowId)
                if (idx === -1) return

                const left = gantt.posFromDate(new Date(Math.max(s, wsMs)))
                const right = act.isAnchoragePlaceholder
                    ? gantt.posFromDate(new Date(Math.min(s + (this.timeIntervalHours * 60 * 60 * 1000), weMs)))
                    : gantt.posFromDate(new Date(Math.min(e, weMs)))
                const width = right - left
                if (width <= 0) return

                const top = gantt.getRowTop(idx)
                const pad = 3

                const rowStyle = ROW_STYLES[act.rowType] || ROW_STYLES.berth
                const barColor = rowStyle.color
                const borderColor = rowStyle.borderColor

                const bar = document.createElement('div')
                bar.className = 'custom-act-bar'
                Object.assign(bar.style, {
                    position:   'absolute',
                    left:       `${left}px`,
                    top:        `${top + pad}px`,
                    width:      `${width}px`,
                    height:     `${rh - pad * 2}px`,
                    background: barColor,
                    border:     `2px solid ${borderColor}`,
                    color:      '#333',
                    fontSize:   '12px',
                    display:    'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow:   'hidden',
                    boxSizing:  'border-box',
                    borderRadius: '2px',
                    zIndex:     '5',
                    whiteSpace: 'nowrap',
                    cursor:     'default',
                })

                if (act.isAnchoragePlaceholder) {
                    bar.style.borderRadius = '2px'
                }
                const isLeftClipped  = s < wsMs
                const isRightClipped = !act.isAnchoragePlaceholder && e > weMs

                const lbl = document.createElement('span')
                lbl.textContent = act.isAnchoragePlaceholder
                    ? (act.sourceShip || act.barLabel || '錨地')
                    : (act.barLabel || '')
                lbl.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;'
                bar.appendChild(lbl)

                // 跨週箭頭：CSS 三角形，position:absolute 貼於 bar 內側邊緣
                if (isLeftClipped) {
                    const arrow = document.createElement('div')
                    arrow.style.cssText = `
                        position:absolute; left:3px; top:50%;
                        transform:translateY(-50%);
                        width:0; height:0;
                        border-top:7px solid transparent;
                        border-bottom:7px solid transparent;
                        border-right:9px solid ${borderColor};
                        pointer-events:none;
                        z-index:6;
                    `
                    bar.appendChild(arrow)
                }
                if (isRightClipped) {
                    const arrow = document.createElement('div')
                    arrow.style.cssText = `
                        position:absolute; right:3px; top:50%;
                        transform:translateY(-50%);
                        width:0; height:0;
                        border-top:7px solid transparent;
                        border-bottom:7px solid transparent;
                        border-left:9px solid ${borderColor};
                        pointer-events:none;
                        z-index:6;
                    `
                    bar.appendChild(arrow)
                }
                // ── Hover tooltip 事件 ──
                bar.addEventListener('mouseenter', () => {
                    const r = bar.getBoundingClientRect()
                    const lines = [
                        `船舶：${act.sourceShip || '—'}`,
                        `泊位：${act.rowText || act.sourceBerthId || '—'}`,
                        `油品：MFO180 ${act.sourceMFO180 || 0} / MFO380 ${act.sourceMFO380 || 0} / MGO ${act.sourceMGO || 0}`,
                        `標籤：${act.barLabel || '—'}`,
                        `開始：${this.fmtDt(act.actStart)}`,
                        `結束：${act.actEnd ? this.fmtDt(act.actEnd) : '未定'}`,
                    ].join('\n')
                    this.positionTooltip(hoverTooltip, r, lines)
                })
                bar.addEventListener('mouseleave', () => {
                    hoverTooltip.style.display = 'none'
                })

                barsArea.appendChild(bar)
            })
        })

        // 依當前週次載入 API 資料（需在 parse 前完成，確保首屏可畫出 bars）
        await this.loadWeekData()

        gantt.init(this.$refs.dhtmlxGantt)
        this.rebuildGanttRows()
        // v-show 在 hasNoWeekData=false 後才把容器顯示；
        // 需等 Vue DOM 更新後 gantt 才能正確量測尺寸並繪製。
        if (!this.hasNoWeekData) {
            await this.$nextTick()
            gantt.render()
            gantt.setSizes()
        }
    },
    beforeDestroy() {
        if (this._hoverTooltip?.parentNode) this._hoverTooltip.parentNode.removeChild(this._hoverTooltip)
    },
}
</script>

<style lang="scss" scoped>

.dhtmlx-gantt-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
}

/* ── Gantt 容器 ──*/
.dhtmlx-gantt {
    width: 100%;
    position: relative;
}

.dhtmlx-gantt.loading-state {
    min-height: 350px;
}

.hidden-bar {
    display: none !important;
}

/* 泊位數字向右偏移，避免被 section overlay 蓋住 */
.dhtmlx-gantt .gantt_grid_data .gantt_row .gantt_cell {
    padding-left: 52px !important;
}

/* 每天起始格加粗左邊框 */
.gantt_task_cell.day-start {
    border-left: 1px solid $color-text-hint !important;
}

/* 封鎖時段：紅色框遮罩 */
.gantt_task_cell.blocked-period {
    position: relative;
}

.gantt_task_cell .blocked-cell-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.modal-dialog {
    width: 480px;
    max-height: 90vh;
}

.modal-body {
    gap: 16px;
}

.form-row {
    gap: 10px;

    input[type="date"] {
        flex: 1.5;
    }

    input[type="text"],
    input[type="date"],
    select {
        height: 34px;
        padding: 0 10px;
    }
}

.modal-footer {
    flex-shrink: 0;
}
</style>
