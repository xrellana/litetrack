<template>
  <div class="app-footer-wrapper">
    <footer class="app-footer">
      <div class="footer-links">
        <a href="#" class="footer-link">{{ $t('footer.about') }}</a>
        <a href="#" class="footer-link">{{ $t('footer.privacy') }}</a>
        <a href="#" class="footer-link">{{ $t('footer.terms') }}</a>
        <a href="#" class="footer-link">{{ $t('footer.contact') }}</a>
      </div>
      <div class="footer-rights">
        &copy; {{ new Date().getFullYear() }} LiteTrack. {{ $t('footer.rights') }}
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-footer-wrapper {
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: center;
}

.app-footer {
  width: 100%;
  max-width: var(--shell-max-width);
  padding: 24px 28px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
}

.footer-link {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--primary);
}

.footer-rights {
  color: var(--subtle);
  font-size: 0.85rem;
}

@media (min-width: 640px) {
  .app-footer {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
