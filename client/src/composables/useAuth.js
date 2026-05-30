import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

export function useAuth() {
  const auth = useAuthStore();
  return {
    auth,
    ...storeToRefs(auth)
  };
}

