<template>
  <div class="language-switcher">
    <select v-model="$i18n.locale" class="lang-select" :aria-label="$t('nav.switchLang')" :title="$t('nav.switchLang')">
      <option value="en">English</option>
      <option value="zh-CN">简体中文</option>
    </select>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
}
.lang-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 32px;
}
.lang-select:focus,
.lang-select:hover {
  border-color: var(--primary);
}
</style>
