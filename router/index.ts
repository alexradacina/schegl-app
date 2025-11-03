import { createRouter, createWebHistory } from "@ionic/vue-router"
import type { RouteRecordRaw } from "vue-router"
import TabsPage from "../views/TabsPage.vue"
import { useAuthStore } from "@/stores/auth"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    component: () => import("../views/LoginPage.vue"),
  },
  {
    path: "/tabs/",
    component: TabsPage,
    children: [
      {
        path: "",
        redirect: "/tabs/assignments",
      },
      {
        path: "assignments",
        component: () => import("../views/AssignmentsPage.vue"),
      },
      {
        path: "assignments/:id",
        component: () => import("../views/AssignmentDetailPage.vue"),
      },
      {
        path: "machines",
        component: () => import("../views/MachinesPage.vue"),
      },
      {
        path: "profile",
        component: () => import("../views/ProfilePage.vue"),
      },
      {
        path: "draw",
        component: () => import("../views/DrawPage.vue"),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * Navigation Guards
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  console.log('x');
  // Redirect logged-in users away from /login
  if (to.path === "/login" && authStore.isAuthenticated) {
    return next("/tabs/assignments")
  }

  // Protect /tabs/* routes
  if (to.path.startsWith("/tabs") && !authStore.isAuthenticated) {
    return next("/login")
  }

  return next()
})

export default router
