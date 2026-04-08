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
            <a role="button" class="nav-btn add-btn" @click.stop="openAddModal">＋ 新增</a>
        </div>

        <div class="dhtmlx-gantt">
            <div ref="dhtmlxGantt" style="width: 100%;"></div>
        </div>

        <!-- 設定 Modal -->
        <transition name="modal-fade">
            <div v-if="settingsVisible" class="dg-modal-overlay" @click.self="settingsVisible = false">
                <div class="dg-modal-dialog">
                    <div class="dg-modal-header">
                        <span>甘特圖設定</span>
                        <button class="dg-modal-close" @click="settingsVisible = false">✕</button>
                    </div>
                    <div class="dg-modal-body">
                        <div class="dg-form-row">
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
                            <span class="dg-hint">（當前：{{ timeIntervalHours }} 小時/格）</span>
                        </div>
                    </div>
                    <div class="dg-modal-footer">
                        <button class="dg-btn-cancel" @click="settingsVisible = false">取消</button>
                        <button class="dg-btn-save" @click="saveSettings">儲存設定</button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- 新增 Modal -->
        <transition name="modal-fade">
            <div v-if="addVisible" class="dg-modal-overlay" @click.self="addVisible = false">
                <div class="dg-modal-dialog">
                    <div class="dg-modal-header">
                        <span>新增泊位活動</span>
                        <button class="dg-modal-close" @click="addVisible = false">✕</button>
                    </div>
                    <div class="dg-modal-body">
                        <div class="dg-form-row">
                            <label>區域</label>
                            <select v-model="addForm.section" @change="addForm.berth = ''">
                                <option value="">請選擇</option>
                                <option v-for="s in sectionOptions" :key="s.prefix" :value="s.prefix">{{ s.name }}</option>
                            </select>
                        </div>
                        <div class="dg-form-row">
                            <label>泊位</label>
                            <select v-model="addForm.berth" :disabled="!addForm.section">
                                <option value="">請選擇</option>
                                <option v-for="n in berthOptions" :key="n" :value="String(n)">{{ n }}</option>
                            </select>
                        </div>
                        <div class="dg-form-row">
                            <label>標籤</label>
                            <input type="text" v-model="addForm.barLabel" placeholder="請輸入標籤" />
                        </div>
                        <div class="dg-form-row">
                            <label>開始時間</label>
                            <input type="date" v-model="addForm.startDate" />
                            <select v-model="addForm.startTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                        <div class="dg-form-row">
                            <label>結束時間</label>
                            <input type="date" v-model="addForm.endDate" />
                            <select v-model="addForm.endTime">
                                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="dg-modal-footer">
                        <button class="dg-btn-cancel" @click="addVisible = false">取消</button>
                        <button class="dg-btn-save" @click="saveAdd">儲存</button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

const SECTIONS = [
    { name: '碼頭',  prefix: 'w', ids: ['w1','w2','w3','w4','w5','w6','w7','w8','w9','w10'], color: '#a8c8e8', borderColor: '#4a90c4' },
    { name: '浮桶',  prefix: 'b', ids: ['b1','b2','b3','b4','b5'],                            color: '#e8b87a', borderColor: '#c07030' },
    { name: '錨地',  prefix: 'a', ids: ['a1','a2','a3','a4','a5'],                            color: '#f0b0c8', borderColor: '#c03070' },
    { name: '油駁船', prefix: 't', ids: ['t1','t2','t3'],                                      color: '#c03030', borderColor: '#900000' },
]

export default {
    name: 'DhtmlxGantt',
    data() {
        return {
            currentWeekStart: null,
            selectedYear: new Date().getFullYear(),
            selectedWeek: 1,
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
            gantt.render()
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
        gantt.templates.timeline_cell_class = (_task, date) => {
            const classes = []
            const t = date.getTime()
            for (const r of this.blockedRanges) {
                if (t >= r.start.getTime() && t < r.end.getTime()) classes.push('blocked-period')
            }
            if (date.getHours() === 0) classes.push('day-start')
            return classes.join(' ')
        }
    },
    mounted() {
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

            // ── Section overlay ──
            ganttRoot.querySelectorAll('.section-label-overlay').forEach(el => el.remove())
            const gridData = ganttRoot.querySelector('.gantt_grid_data')
            if (gridData) {
                SECTIONS.forEach(({ name, ids }) => {
                    const firstIdx = gantt.getTaskIndex(ids[0])
                    if (firstIdx === -1) return
                    const top    = gantt.getRowTop(firstIdx)
                    const height = gantt.config.row_height * ids.length

                    const el = document.createElement('div')
                    el.className = 'section-label-overlay'
                    el.textContent = name
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
            const wsMs = gantt.config.start_date.getTime()
            const weMs = gantt.config.end_date.getTime()
            const rh   = gantt.config.row_height

            this.activities.forEach(act => {
                if (!act.actStart || !act.actEnd) return
                const s = act.actStart.getTime()
                const e = act.actEnd.getTime()
                if (e <= wsMs || s >= weMs) return // 活動完全在視窗外，不畫

                const idx = gantt.getTaskIndex(act.berthId)
                if (idx === -1) return

                const left  = gantt.posFromDate(new Date(Math.max(s, wsMs)))
                const right = gantt.posFromDate(new Date(Math.min(e, weMs)))
                const width = right - left
                if (width <= 0) return

                const top = gantt.getRowTop(idx)
                const pad = 3

                // 依 berthId prefix 查對應 Section 顏色
                const sec = SECTIONS.find(s => act.berthId.startsWith(s.prefix))
                const barColor    = sec ? sec.color       : '#a8c8e8'
                const borderColor = sec ? sec.borderColor : '#4a90c4'

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
                const isLeftClipped  = s < wsMs
                const isRightClipped = e > weMs

                const lbl = document.createElement('span')
                lbl.textContent = act.barLabel || ''
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
                const secName = sec ? SECTIONS.find(s2 => s2.prefix === sec.prefix)?.name : ''
                bar.addEventListener('mouseenter', () => {
                    const r = bar.getBoundingClientRect()
                    const lines = [
                        `泊位：${secName} ${act.berthId}`,
                        `標籤：${act.barLabel || '—'}`,
                        `開始：${this.fmtDt(act.actStart)}`,
                        `結束：${this.fmtDt(act.actEnd)}`,
                    ].join('\n')
                    this.positionTooltip(hoverTooltip, r, lines)
                })
                bar.addEventListener('mouseleave', () => {
                    hoverTooltip.style.display = 'none'
                })

                barsArea.appendChild(bar)
            })
        })

        // ── Mock 活動資料（模擬 GET /api/berth-activities 回傳）──
        // 必須在 gantt.parse() 之前賦值，否則 parse 觸發 onGanttRender 時 activities 還是空陣列。
        // 串接後端時，將此段替換為 API 呼叫，並將回傳的日期字串轉為 Date 物件。
        const d = (m, day, h = 0) => new Date(2026, m - 1, day, h, 0)
        this.activities = [
            // 碼頭
            { id: 'act_001', berthId: 'w1', barLabel: 'A船 MFO 70(L)',          actStart: d(4,1,6),  actEnd: d(4,2,0)  },
            { id: 'act_002', berthId: 'w2', barLabel: 'B船 MFO 50(L)',          actStart: d(4,1,6),  actEnd: d(4,2,0)  },
            { id: 'act_003', berthId: 'w3', barLabel: 'C船 MFO 45(L)',          actStart: d(4,1,6),  actEnd: d(4,2,0)  },
            { id: 'act_004', berthId: 'w4', barLabel: 'D船 MFO 200(H) MGO 50', actStart: d(4,4,0),  actEnd: d(4,6,0)  },
            { id: 'act_005', berthId: 'w5', barLabel: 'E船 MFO 40(L)',          actStart: d(4,4,0),  actEnd: d(4,5,0)  },
            { id: 'act_006', berthId: 'w6', barLabel: 'F船 MFO 150(L)',         actStart: d(4,7,0),  actEnd: d(4,9,24) },
            { id: 'act_007', berthId: 'w7', barLabel: 'G船 MFO 55(L)',          actStart: d(4,8,0),  actEnd: d(4,9,24) },
            // 浮桶
            { id: 'act_011', berthId: 'b1', barLabel: 'H船 MFO 225(L) MGO 40', actStart: d(4,5,0),  actEnd: d(4,8,24) },
            { id: 'act_012', berthId: 'b2', barLabel: 'I船 MFO 125(L)',         actStart: d(4,4,0),  actEnd: d(4,6,24) },
            // 錨地
            { id: 'act_021', berthId: 'a1', barLabel: 'J船 MFO 2,000(H)',       actStart: d(4,1,0),  actEnd: d(4,2,0)  },
            // 油駁船
            { id: 'act_031', berthId: 't1', barLabel: '',                        actStart: d(4,1,0),  actEnd: d(4,1,12) },
        ]

        gantt.init(this.$refs.dhtmlxGantt)
        gantt.clearAll()

        // ── 泊位列（靜態骨架，前端自維護；所有 task start/end 固定 2020-2030）──
        // 後端不需提供此資料，僅提供 activities 清單。
        const FOREVER = { start_date: new Date(2020, 0, 1), end_date: new Date(2030, 11, 31) }
        gantt.parse({
            data: [
                // 碼頭 w1–w10
                ...Array.from({ length: 10 }, (_, i) => ({ id: `w${i+1}`, text: String(i+1), ...FOREVER })),
                // 浮桶 b1–b5
                ...Array.from({ length: 5  }, (_, i) => ({ id: `b${i+1}`, text: String(i+1), ...FOREVER })),
                // 錨地 a1–a5
                ...Array.from({ length: 5  }, (_, i) => ({ id: `a${i+1}`, text: String(i+1), ...FOREVER })),
                // 油駁船 t1–t3
                ...Array.from({ length: 3  }, (_, i) => ({ id: `t${i+1}`, text: String(i+1), ...FOREVER })),
            ],
            links: []
        })
    },
    beforeDestroy() {
        if (this._hoverTooltip?.parentNode) this._hoverTooltip.parentNode.removeChild(this._hoverTooltip)
    },
}
</script>

<style lang="scss">
.dhtmlx-gantt-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
}

/* ── Toolbar（與 PlanGantt 共用相同 class）──*/
.plan-gantt-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #ddd;
}

.nav-spacer {
    flex: 1;
}

.nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    line-height: 1;
    padding: 4px 12px;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f0f0f0;
    text-decoration: none;
    user-select: none;

    &:hover { background: #e0e0e0; }

    &.today-btn {
        font-size: 0.95em;
        height: 34px;
        padding: 0 16px;
        background: #1a6fd4;
        color: #fff;
        border-color: #1a6fd4;
        &:hover { background: #155ab8; border-color: #155ab8; }
    }

    &.settings-btn {
        font-size: 0.95em !important;
        height: 34px !important;
        padding: 0 14px !important;
        background: #7b68ee !important;
        color: #fff !important;
        border-color: #7b68ee !important;
        &:hover { background: #6c63d5 !important; border-color: #6c63d5 !important; }
    }

    &.add-btn {
        font-size: 0.95em !important;
        height: 34px !important;
        padding: 0 16px !important;
        background: #179b0b !important;
        color: #fff !important;
        border-color: #179b0b !important;
        &:hover { background: #188d0d !important; border-color: #188d0d !important; }
    }
}

.nav-timeinterval {
    font-size: 0.875em;
    align-self: end;
}

.nav-select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    color: #333;
    font-size: 0.9em;
}

/* ── Gantt 容器 ──*/
.dhtmlx-gantt {
    width: 100%;
    height: auto;
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
    border-left: 1px solid #888 !important;
}

/* 封鎖時段：紅色框遮罩 */
.gantt_task_cell.blocked-period {
    background-color: rgba(200, 30, 30, 0.06);
}

/* ── Modal 共用 ── */
.dg-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .dg-modal-dialog,
.modal-fade-leave-active .dg-modal-dialog { transition: transform 0.22s ease, opacity 0.22s ease; }
.modal-fade-enter .dg-modal-dialog,
.modal-fade-leave-to .dg-modal-dialog { transform: translateY(10px) scale(0.98); opacity: 0; }

.dg-modal-dialog {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.22);
    width: 480px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.dg-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #eee;
    font-size: 1.05em;
    font-weight: 700;
    color: #222;
}

.dg-modal-close {
    background: none;
    border: none;
    font-size: 1.1em;
    cursor: pointer;
    color: #888;
    padding: 2px 6px;
    border-radius: 4px;
    &:hover { background: #f0f0f0; color: #333; }
}

.dg-modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
}

.dg-form-row {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
        width: 110px;
        flex-shrink: 0;
        font-size: 0.9em;
        color: #555;
        font-weight: 500;
    }

    select, input[type="text"], input[type="date"] {
        flex: 1;
        height: 34px;
        padding: 0 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 0.9em;
        background: #fff;
        &:focus { outline: none; border-color: #1a6fd4; box-shadow: 0 0 0 2px rgba(26,111,212,0.15); }
    }

    input[type="date"] { flex: 1.5; }
}

.dg-hint {
    color: #999;
    font-size: 0.82em;
    white-space: nowrap;
}

.dg-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px 16px;
    border-top: 1px solid #eee;
    flex-shrink: 0;
}

.dg-btn-cancel {
    padding: 7px 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 0.9em;
    &:hover { background: #e8e8e8; }
}

.dg-btn-save {
    padding: 7px 22px;
    border: none;
    border-radius: 5px;
    background: #1a6fd4;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    &:hover { background: #155ab8; }
}
</style>
