<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { LogIn } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const error = ref('');
const form = reactive({ identifier: '', password: '' });

async function submit() {
  error.value = '';
  try {
    await auth.login(form);
    await router.push(route.query.redirect || '/');
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-panel">
      <div class="auth-brand">
        <div class="brand-mark">LT</div>
        <div>
          <h1>{{ $t('app.name') }}</h1>
          <p>{{ $t('app.taglineLogin') }}</p>
        </div>
      </div>
      <form class="auth-form stack" @submit.prevent="submit">
        <div>
          <h2 style="margin:0">{{ $t('auth.login') }}</h2>
          <p class="muted" style="margin:4px 0 0">{{ $t('auth.loginSubtitle') }}</p>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
        <label class="field">
          <span>{{ $t('common.usernameOrEmail') }}</span>
          <input v-model="form.identifier" class="input" autocomplete="username" required />
        </label>
        <label class="field">
          <span>{{ $t('common.password') }}</span>
          <input v-model="form.password" class="input" type="password" autocomplete="current-password" required />
        </label>
        <button class="button" type="submit" :disabled="auth.loading">
          <LogIn :size="18" /> {{ $t('auth.login') }}
        </button>
        <p class="muted">
          {{ $t('auth.needAccount') }}
          <RouterLink to="/register" style="color:var(--primary)">{{ $t('auth.register') }}</RouterLink>
        </p>
      </form>
    </section>
  </main>
</template>
