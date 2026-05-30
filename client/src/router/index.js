import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', redirect: '/teams' },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { public: true } },
  { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, requiresInstanceAdmin: true } },
  { path: '/teams', name: 'teams', component: () => import('../views/TeamsView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/item/:itemId', name: 'item-detail', component: () => import('../views/ItemDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/my-items', name: 'my-items', component: () => import('../views/MyItemsView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/activity', name: 'activity', component: () => import('../views/ActivityView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/settings', name: 'settings', component: () => import('../views/TeamSettingsView.vue'), meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.loaded) {
    await auth.fetchMe();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresInstanceAdmin && !auth.user?.is_instance_admin) {
    return { name: 'teams' };
  }
  if (to.meta.public && auth.isAuthenticated) {
    return { name: 'teams' };
  }
  return true;
});

export default router;
