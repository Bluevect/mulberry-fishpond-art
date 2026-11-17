import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'handscroll',
      component: () => import('@/views/ScrollStoryView.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
