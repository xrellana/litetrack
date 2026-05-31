<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { UserPlus } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const error = ref('');
const form = reactive({ username: '', email: '', display_name: '', password: '' });

async function submit() {
  error.value = '';
  try {
    await auth.register(form);
    await router.push('/');
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
          <p>{{ $t('app.taglineRegister') }}</p>
        </div>
      </div>
      <form class="auth-form stack" @submit.prevent="submit">
        <div>
          <h2 style="margin:0">{{ $t('auth.register') }}</h2>
          <p class="muted" style="margin:4px 0 0">{{ $t('auth.registerSubtitle') }}</p>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
        <label class="field">
          <span>{{ $t('common.username') }}</span>
          <input v-model="form.username" class="input" minlength="3" maxlength="32" required />
        </label>
        <label class="field">
          <span>{{ $t('common.email') }}</span>
          <input v-model="form.email" class="input" type="email" required />
        </label>
        <label class="field">
          <span>{{ $t('auth.displayName') }}</span>
          <input v-model="form.display_name" class="input" maxlength="80" />
        </label>
        <label class="field">
          <span>{{ $t('common.password') }}</span>
          <input v-model="form.password" class="input" type="password" minlength="8" autocomplete="new-password" required />
        </label>
        <button class="button" type="submit" :disabled="auth.loading">
          <UserPlus :size="18" /> {{ $t('auth.register') }}
        </button>
        <p class="muted">
          {{ $t('auth.alreadyRegistered') }}
          <RouterLink to="/login" style="color:var(--primary)">{{ $t('auth.login') }}</RouterLink>
        </p>
      </form>
    </section>
  </main>
</template>
