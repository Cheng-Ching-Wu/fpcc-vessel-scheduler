<template>
  <div id="app">
    <nav class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span class="sidebar-title">Menu</span>
        <button class="toggle-btn" @click="isCollapsed = !isCollapsed">
          {{ isCollapsed ? '›' : '‹' }}
        </button>
      </div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.name">
          <router-link :to="item.path" active-class="active" :exact="item.exact">
            <span class="nav-icon material-symbols-outlined">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <main class="main-content" :class="{ expanded: isCollapsed }">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      isCollapsed: false,
      navItems: [
        { name: 'PlanGantt', label: 'Plan Gantt', path: '/', exact: true, icon: 'calendar_month' },
        { name: 'DhtmlxGantt', label: 'Dhtmlx Gantt', path: '/DhtmlxGantt', icon: 'view_timeline' },
        { name: 'GoogleIconsDemo', label: 'Google Icons', path: '/google-icons', icon: 'palette' },
      ]
    }
  }
}
</script>

<style lang="scss">
@use '@/styles/index.scss' as *;

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 220px;
  background-color: #2c3e50;
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 100;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px;
  border-bottom: 1px solid #3d5166;
}

.sidebar-title {
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
}

.sidebar.collapsed .sidebar-title {
  display: none;
}

.toggle-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.nav-list {
  list-style: none;
  padding: 8px 0;
}

.nav-list li a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #ccc;
  text-decoration: none;
  transition: background 0.2s;
  white-space: nowrap;
}

.nav-list li a:hover,
.nav-list li a.active {
  background-color: #3d5166;
  color: #fff;
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  font-variation-settings: 'FILL' 0;
}

.sidebar.collapsed .nav-label {
  display: none;
}

.main-content {
  min-height: 100vh;
  margin-left: 220px;
  min-width: 0;
  max-width: 100%;
  padding: 32px;
  background-color: #f5f7fa;
  transition: margin-left 0.3s ease;
  overflow-x: hidden;
}

.main-content.expanded {
  margin-left: 60px;
}
</style>
