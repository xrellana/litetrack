import { ref } from 'vue';

const themePref = ref(localStorage.getItem('theme-preference') || 'system');
const isDark = ref(document.documentElement.getAttribute('data-theme') === 'dark');

function applyTheme() {
  const dark = themePref.value === 'dark' || 
    (themePref.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  isDark.value = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('theme-preference', themePref.value);
}

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themePref.value === 'system') {
    applyTheme();
  }
});

export function useTheme() {
  const cycleTheme = () => {
    if (themePref.value === 'system') themePref.value = 'light';
    else if (themePref.value === 'light') themePref.value = 'dark';
    else themePref.value = 'system';
    
    applyTheme();
  };

  return {
    themePref,
    isDark,
    cycleTheme
  };
}
