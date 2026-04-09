<template>
  <section class="google-icons-page">
    <header class="page-header">
      <h1>Google Icons 範例</h1>
      <p>下方是針對船務排程專案挑選的常用清單（約 250~300 個），包含圖示、icon 名稱與 class 名稱。</p>
    </header>

    <div class="toolbar">
      <input
        v-model.trim="keyword"
        type="text"
        class="search-input"
        placeholder="搜尋 icon 名稱，例如 anchor、schedule、warning"
      />
      <span class="result-count">共 {{ filteredIcons.length }} 個</span>
    </div>

    <div class="icons-grid">
      <article class="icon-card" v-for="icon in filteredIcons" :key="icon">
        <div class="icon-preview-wrap">
          <span class="material-symbols-outlined icon-preview">{{ icon }}</span>
        </div>
        <h2 class="icon-name">{{ icon }}</h2>
        <button
          type="button"
          class="copy-row"
          @click="copyText('material-symbols-outlined', icon, 'class')"
        >
          class: material-symbols-outlined
          <span class="copy-hint">{{ copiedKey === `class:${icon}` ? '已複製' : '點擊複製' }}</span>
        </button>
        <button
          type="button"
          class="copy-row"
          @click="copyText(icon, icon, 'token')"
        >
          icon token: {{ icon }}
          <span class="copy-hint">{{ copiedKey === `token:${icon}` ? '已複製' : '點擊複製' }}</span>
        </button>
      </article>
    </div>
  </section>
</template>

<script>
const RAW_ICONS = [
  'home',
  'cottage',
  'apartment',
  'business',
  'badge',
  'menu',
  'apps',
  'widgets',
  'tune',
  'filter_list',
  'sort',
  'more_horiz',
  'more_vert',
  'expand_more',
  'expand_less',
  'chevron_left',
  'chevron_right',
  'arrow_back',
  'arrow_forward',
  'arrow_upward',
  'arrow_downward',
  'unfold_more',
  'fullscreen',
  'fullscreen_exit',
  'open_in_new',
  'search',
  'settings',
  'settings_applications',
  'settings_suggest',
  'settings_input_component',
  'manage_accounts',
  'admin_panel_settings',
  'account_circle',
  'supervisor_account',
  'person',
  'person_add',
  'person_remove',
  'person_search',
  'person_check',
  'badge',
  'group',
  'groups',
  'diversity_3',
  'notifications',
  'notifications_active',
  'campaign',
  'mail',
  'mark_email_read',
  'mark_email_unread',
  'chat',
  'forum',
  'call',
  'call_end',
  'contact_phone',
  'contact_mail',
  'live_help',
  'support',
  'calendar_month',
  'event',
  'schedule',
  'update',
  'history',
  'timer',
  'timer_10',
  'hourglass_empty',
  'hourglass_top',
  'date_range',
  'event_available',
  'event_busy',
  'event_note',
  'event_repeat',
  'event_upcoming',
  'alarm',
  'alarm_on',
  'alarm_off',
  'view_timeline',
  'timeline',
  'schedule_send',
  'pending_actions',
  'checklist',
  'task',
  'task_alt',
  'assignment',
  'assignment_ind',
  'assignment_turned_in',
  'fact_check',
  'rule',
  'playlist_add_check',
  'done_all',
  'check',
  'close',
  'close_small',
  'cancel',
  'remove',
  'add',
  'add_circle',
  'remove_circle',
  'control_point',
  'edit',
  'edit_note',
  'draw',
  'delete',
  'delete_forever',
  'restore_from_trash',
  'content_copy',
  'content_cut',
  'content_paste',
  'copy_all',
  'save',
  'save_as',
  'publish',
  'download',
  'upload',
  'sync',
  'sync_alt',
  'refresh',
  'autorenew',
  'restart_alt',
  'bolt',
  'play_arrow',
  'pause',
  'stop',
  'replay',
  'fast_forward',
  'fast_rewind',
  'skip_next',
  'skip_previous',
  'power_settings_new',
  'logout',
  'login',
  'launch',
  'open_with',
  'swap_horiz',
  'swap_vert',
  'bar_chart',
  'show_chart',
  'stacked_bar_chart',
  'ssid_chart',
  'area_chart',
  'pie_chart',
  'multiline_chart',
  'insert_chart',
  'monitoring',
  'insights',
  'analytics',
  'dashboard',
  'dashboard_customize',
  'monitor',
  'tv_options_edit_channels',
  'scoreboard',
  'query_stats',
  'equalizer',
  'trending_up',
  'trending_down',
  'candlestick_chart',
  'waterfall_chart',
  'table_view',
  'table_chart',
  'table_rows',
  'table_restaurant',
  'grid_view',
  'list',
  'view_list',
  'view_module',
  'view_column',
  'view_quilt',
  'view_comfy',
  'view_compact',
  'reorder',
  'segment',
  'splitscreen',
  'preview',
  'visibility',
  'visibility_off',
  'zoom_in',
  'zoom_out',
  'fit_screen',
  'center_focus_strong',
  'palette',
  'brush',
  'format_color_fill',
  'format_color_text',
  'format_paint',
  'layers',
  'layers_clear',
  'style',
  'category',
  'label',
  'label_important',
  'sell',
  'bookmark',
  'bookmark_added',
  'bookmark_remove',
  'flag',
  'star',
  'star_half',
  'favorite',
  'thumb_up',
  'thumb_down',
  'recommend',
  'workspace_premium',
  'military_tech',
  'workspace_premium',
  'verified',
  'verified_user',
  'verified_user',
  'gpp_maybe',
  'gpp_bad',
  'shield',
  'shield_lock',
  'security',
  'lock',
  'lock_open',
  'lock_reset',
  'password',
  'key',
  'vpn_key',
  'fingerprint',
  'privacy_tip',
  'policy',
  'warning',
  'report',
  'dangerous',
  'priority_high',
  'notification_important',
  'info',
  'help',
  'help_center',
  'tips_and_updates',
  'new_releases',
  'feedback',
  'support_agent',
  'engineering',
  'construction',
  'build',
  'handyman',
  'settings_ethernet',
  'settings_remote',
  'memory',
  'storage',
  'database',
  'dns',
  'cloud',
  'cloud_done',
  'cloud_upload',
  'cloud_download',
  'cloud_sync',
  'cloud_off',
  'api',
  'terminal',
  'code',
  'data_object',
  'integration_instructions',
  'bug_report',
  'device_hub',
  'lan',
  'router',
  'wifi',
  'wifi_tethering',
  'bluetooth',
  'print',
  'qr_code',
  'qr_code_scanner',
  'nfc',
  'sensors',
  'satellite_alt',
  'travel_explore',
  'public',
  'language',
  'translate',
  'map',
  'location_on',
  'location_off',
  'my_location',
  'pin_drop',
  'place',
  'near_me',
  'explore',
  'route',
  'alt_route',
  'navigation',
  'compass_calibration',
  'gps_fixed',
  'add_location',
  'edit_location',
  'fmd_good',
  'fmd_bad',
  'directions',
  'directions_boat',
  'departure_board',
  'kayaking',
  'rowing',
  'surfing',
  'sailing',
  'anchor',
  'water',
  'tsunami',
  'local_shipping',
  'inventory_2',
  'warehouse',
  'forklift',
  'airport_shuttle',
  'flight',
  'flight_takeoff',
  'flight_land',
  'commute',
  'local_gas_station',
  'ev_station',
  'water_drop',
  'waves',
  'air',
  'storm',
  'thunderstorm',
  'sunny',
  'nights_stay',
  'cloudy',
  'thermostat',
  'compress',
  'speed',
  'offline_bolt',
  'factory',
  'local_fire_department',
  'local_police',
  'health_and_safety',
  'emergency',
  'medical_services',
  'vaccines',
  'fire_extinguisher',
  'report_gmailerrorred',
  'article',
  'description',
  'receipt_long',
  'summarize',
  'snippet_folder',
  'folder',
  'folder_open',
  'folder_shared',
  'folder_copy',
  'topic',
  'inventory',
  'archive',
  'unarchive',
  'source',
  'request_page',
  'note_alt',
  'sticky_note_2',
  'assignment_late',
  'assignment_return',
  'ballot',
  'feed',
  'draft',
  'send',
  'outbox',
  'forward_to_inbox',
  'inbox',
  'move_to_inbox',
  'attach_file',
  'image',
  'photo_camera',
  'photo_library',
  'video_file',
  'movie',
  'slideshow',
  'mic',
  'mic_off',
  'headset_mic',
  'volume_up',
  'volume_off',
  'paid',
  'payments',
  'account_balance_wallet',
  'account_balance',
  'credit_card',
  'point_of_sale',
  'attach_money',
  'currency_exchange',
  'receipt',
  'price_check',
  'price_change',
  'shopping_cart',
  'shopping_bag',
  'request_quote',
  'calculate',
  'functions',
  'percent',
  'science',
  'biotech',
  'emoji_objects',
  'auto_awesome',
  'lightbulb',
  'psychology',
  'school',
  'menu_book',
  'fact_check',
  'check_circle',
  'check_circle_outline',
  'radio_button_checked',
  'radio_button_unchecked',
  'indeterminate_check_box',
  'toggle_on',
  'toggle_off',
  'widgets'
]

const PRIORITY_ICONS = [
  'directions_boat',
  'sailing',
  'anchor',
  'local_shipping',
  'route',
  'navigation',
  'map',
  'location_on',
  'water',
  'water_drop',
  'waves',
  'tsunami',
]

const ICON_ALIAS_MAP = {
  directions_boat: ['boat', 'ship', 'vessel', 'marine', 'shipping', '船', '船舶', '航運', '海運'],
  sailing: ['sailing', 'boat', 'ship', '帆船', '船', '航海'],
  anchor: ['anchor', 'harbor', 'dock', '錨', '港口', '碼頭'],
  local_shipping: ['shipping', 'logistics', 'cargo', '運輸', '貨運', '船運'],
  route: ['route', 'path', '航線', '路線'],
  navigation: ['navigation', 'nav', '航行', '導航'],
  map: ['map', '地圖', '航圖'],
  location_on: ['location', 'pin', '定位', '位置'],
  water: ['water', 'sea', 'ocean', '水', '海'],
  water_drop: ['water', 'drop', 'fuel', '水滴', '燃油'],
  waves: ['waves', 'sea', 'ocean', '波浪', '海浪'],
  tsunami: ['tsunami', 'wave', '海嘯', '波浪'],
}

const ICONS = Array.from(new Set([...PRIORITY_ICONS, ...RAW_ICONS])).slice(0, 280)

export default {
  name: 'GoogleIconsDemo',
  data() {
    return {
      keyword: '',
      icons: ICONS,
      copiedKey: '',
    }
  },
  computed: {
    filteredIcons() {
      const key = this.keyword.toLowerCase()
      if (!key) return this.icons
      return this.icons.filter(icon => {
        if (icon.toLowerCase().includes(key)) return true
        const aliases = ICON_ALIAS_MAP[icon] || []
        return aliases.some(alias => alias.toLowerCase().includes(key))
      })
    }
  },
  methods: {
    async copyText(text, icon, type) {
      const key = `${type}:${icon}`
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const input = document.createElement('textarea')
          input.value = text
          input.setAttribute('readonly', '')
          input.style.position = 'absolute'
          input.style.left = '-9999px'
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        this.copiedKey = key
        setTimeout(() => {
          if (this.copiedKey === key) this.copiedKey = ''
        }, 1500)
      } catch (error) {
        // Ignore copy errors silently to avoid blocking icon browsing.
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.google-icons-page {
  padding: 8px 0;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #1f2d3d;
}

.page-header p {
  margin: 8px 0 0;
  color: #5b6b7b;
}

.toolbar {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 320px;
  max-width: 100%;
  border: 1px solid #c8d3df;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.result-count {
  color: #5b6b7b;
  font-size: 14px;
}

.icons-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.icon-card {
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
}

.icon-preview-wrap {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: #eff5fb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-preview {
  font-size: 30px;
  color: #1a5c9f;
}

.icon-name {
  margin: 12px 0 8px;
  font-size: 16px;
  color: #1f2d3d;
  word-break: break-word;
}

.icon-classname {
  margin: 4px 0;
  color: #4b5c6d;
  font-size: 13px;
  word-break: break-all;
}

.copy-row {
  width: 100%;
  margin: 4px 0;
  padding: 8px 10px;
  border: 1px dashed #c8d3df;
  border-radius: 8px;
  background: #f8fbff;
  color: #2d3f52;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
}

.copy-row:hover {
  border-color: #86a9cc;
  background: #f1f7fd;
}

.copy-hint {
  color: #1a5c9f;
  font-size: 12px;
  white-space: nowrap;
  margin-left: 8px;
}
</style>
