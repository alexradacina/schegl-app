<template>
  <SafeLayout>
    <template #header>
      <ion-toolbar>
        <ion-title>Logiin</ion-title>
      </ion-toolbar>
    </template>

    <div class="login-container">
      <div class="logo-section">
        <ion-icon :icon="constructOutline" size="large" color="primary"></ion-icon>
        <h1>Schlegl</h1>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <ion-item>
          <ion-label position="stacked">Email</ion-label>
          <ion-input
              v-model="email"
              type="email"
              placeholder="Enter your email"
              required
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input
              v-model="password"
              type="password"
              placeholder="Enter your password"
              required
          ></ion-input>
        </ion-item>

        <ion-button
            expand="block"
            type="submit"
            :disabled="authStore.isLoading"
            class="login-button"
        >
          <ion-spinner v-if="authStore.isLoading" name="crescent"></ion-spinner>
          <span v-else>Login</span>
        </ion-button>

        <ion-text color="danger" v-if="authStore.error">
          <p>{{ authStore.error }}</p>
        </ion-text>
      </form>

      <div class="demo-credentials">
        <ion-text color="medium">
          <p><strong>Demo Credentials:</strong></p>
          <p>Email: max.mueller@company.com</p>
          <p>Password: password</p>
        </ion-text>
      </div>
    </div>
  </SafeLayout>
</template>

<script setup lang="ts">
import {
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonIcon,
  IonSpinner,
} from '@ionic/vue'
import { constructOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SafeLayout from '@/components/SafeLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const handleLogin = async () => {
  const result = await authStore.login({
    email: email.value,
    password: password.value,
  })

  if (result.success) {
    router.push('/tabs/assignments')
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.logo-section {
  text-align: center;
  margin-bottom: 3rem;
}

.logo-section h1 {
  margin: 1rem 0 0.5rem 0;
  font-size: 2rem;
  font-weight: bold;
}

.login-form {
  margin-bottom: 2rem;
}

.login-form ion-item {
  margin-bottom: 1rem;
}

.login-button {
  margin-top: 2rem;
  height: 48px;
}

.demo-credentials {
  text-align: center;
  padding: 1rem;
  background: var(--ion-color-light);
  border-radius: 8px;
}

.demo-credentials p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}
</style>
