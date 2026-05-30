import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { public: true } },
  { path: '/admin', name: 'admin-overview', component: () => import('../views/admin/AdminOverview.vue'), meta: { requiresAuth: true, requiresInstanceAdmin: true } },
  { path: '/admin/teams', name: 'admin-teams', component: () => import('../views/admin/AdminTeams.vue'), meta: { requiresAuth: true, requiresInstanceAdmin: true } },
  { path: '/admin/users', name: 'admin-users', component: () => import('../views/admin/AdminUsers.vue'), meta: { requiresAuth: true, requiresInstanceAdmin: true } },
  { path: '/teams', name: 'teams', component: () => import('../views/TeamsView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/item/:itemId', name: 'item-detail', component: () => import('../views/ItemDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/my-items', name: 'my-items', component: () => import('../views/MyItemsView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/activity', name: 'activity', component: () => import('../views/ActivityView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/settings', name: 'settings', component: () => import('../views/UserSettingsView.vue'), meta: { requiresAuth: true } },
  { path: '/team/:id/team', name: 'team-manage', component: () => import('../views/TeamManageView.vue'), meta: { requiresAuth: true } }
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
  
  // Not logged in but requires auth
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // Handle Instance Admin Routing
  if (auth.isAuthenticated && auth.user?.is_instance_admin) {
    // Prevent access to non-admin authenticated routes
    if (to.meta.requiresAuth && !to.meta.requiresInstanceAdmin) {
      return { name: 'admin-overview' };
    }
    // Redirect from public routes to admin instead of home
    if (to.meta.public) {
      return { name: 'admin-overview' };
    }
  }

  // Handle Regular User Routing
  if (auth.isAuthenticated && !auth.user?.is_instance_admin) {
    // Prevent access to admin routes
    if (to.meta.requiresInstanceAdmin) {
      return { name: 'teams' };
    }
    // Redirect from public routes to home
    if (to.meta.public) {
      return { name: 'home' };
    }
  }

  return true;
});

export default router;
