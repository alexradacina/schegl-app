<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="profile-container">
        <!-- User Info Section -->
        <div class="user-info-section">
          <div class="avatar-container">
            <ion-avatar class="user-avatar">
              <img :src="userAvatar" :alt="authStore.user?.name || 'User'" />
            </ion-avatar>
          </div>
          <div class="user-details">
            <h2>{{ authStore.user?.name || 'User Name' }}</h2>
            <p class="user-email">{{ authStore.user?.email || 'user@example.com' }}</p>
            <ion-chip color="primary" size="small">
              <ion-icon :icon="personOutline"></ion-icon>
              <ion-label>{{ authStore.user?.role || 'Technician' }}</ion-label>
            </ion-chip>
          </div>
        </div>

        <!-- Settings List -->
        <ion-list class="settings-list">
          <ion-list-header>
            <ion-label>Settings</ion-label>
          </ion-list-header>

          <!-- Dark Mode Toggle -->
          <ion-item>
            <ion-icon :icon="moonOutline" slot="start"></ion-icon>
            <ion-label>Dark Mode</ion-label>
            <ion-toggle
                slot="end"
                :checked="isDarkMode"
                @ionChange="toggleDarkMode"
            ></ion-toggle>
          </ion-item>

          <!-- Notifications -->
          <ion-item>
            <ion-icon :icon="notificationsOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>Notifications</h3>
              <p>Push notifications for assignments</p>
            </ion-label>
            <ion-toggle
                slot="end"
                :checked="notificationsEnabled"
                @ionChange="toggleNotifications"
            ></ion-toggle>
          </ion-item>

          <!-- Language -->
          <ion-item button @click="openLanguageSelector">
            <ion-icon :icon="languageOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>Language</h3>
              <p>{{ selectedLanguage }}</p>
            </ion-label>
            <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
          </ion-item>

          <!-- About -->
          <ion-item button @click="showAbout">
            <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
            <ion-label>
              <h3>About</h3>
              <p>App version and info</p>
            </ion-label>
            <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
          </ion-item>
        </ion-list>

        <!-- Account Actions -->
        <ion-list class="account-actions">
          <ion-list-header>
            <ion-label>Account</ion-label>
          </ion-list-header>

          <ion-item button @click="changePassword">
            <ion-icon :icon="keyOutline" slot="start"></ion-icon>
            <ion-label>Change Password</ion-label>
            <ion-icon :icon="chevronForwardOutline" slot="end"></ion-icon>
          </ion-item>

          <ion-item button @click="confirmLogout" class="logout-item">
            <ion-icon :icon="logOutOutline" slot="start" color="danger"></ion-icon>
            <ion-label color="danger">Sign Out</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <!-- Language Selector Modal -->
      <ion-modal :is-open="showLanguageModal" @didDismiss="closeLanguageSelector">
        <ion-header>
          <ion-toolbar>
            <ion-title>Select Language</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeLanguageSelector">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-radio-group :value="selectedLanguage" @ionChange="changeLanguage">
              <ion-item v-for="language in availableLanguages" :key="language.code">
                <ion-label>{{ language.name }}</ion-label>
                <ion-radio slot="end" :value="language.name"></ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>
        </ion-content>
      </ion-modal>

      <!-- About Modal -->
      <ion-modal :is-open="showAboutModal" @didDismiss="closeAbout">
        <ion-header>
          <ion-toolbar>
            <ion-title>About</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeAbout">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="about-content">
          <div class="about-info">
            <div class="app-logo">
              <ion-icon :icon="constructOutline" size="large" color="primary"></ion-icon>
            </div>
            <h2>Schlegl</h2>
            <p class="version">Version 1.0.0</p>
            <p class="description">
              Manage your route assignments, track progress, and stay connected with your team.
            </p>
            <div class="company-info">
              <p>&copy; 2025 Your Company Name</p>
              <p>All rights reserved</p>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Logout Confirmation -->
      <ion-alert
          :is-open="showLogoutAlert"
          header="Sign Out"
          message="Are you sure you want to sign out?"
          :buttons="logoutButtons"
          @didDismiss="showLogoutAlert = false"
      ></ion-alert>

      <!-- Toast for notifications -->
      <ion-toast
          :is-open="showToast"
          :message="toastMessage"
          :duration="2000"
          @didDismiss="showToast = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonAvatar,
  IonChip,
  IonModal,
  IonButtons,
  IonButton,
  IonRadioGroup,
  IonRadio,
  IonAlert,
  IonToast,
} from '@ionic/vue'
import {
  personOutline,
  moonOutline,
  notificationsOutline,
  languageOutline,
  informationCircleOutline,
  keyOutline,
  logOutOutline,
  chevronForwardOutline,
  constructOutline,
} from 'ionicons/icons'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Reactive state
const isDarkMode = ref(false)
const notificationsEnabled = ref(true)
const selectedLanguage = ref('English')
const showLanguageModal = ref(false)
const showAboutModal = ref(false)
const showLogoutAlert = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

// Available languages
const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
]

// User avatar - fallback to a default avatar
const userAvatar = computed(() => {
  return authStore.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authStore.user?.name || 'User')}&background=3880ff&color=fff`
})

// Logout confirmation buttons
const logoutButtons = [
  {
    text: 'Cancel',
    role: 'cancel',
  },
  {
    text: 'Sign Out',
    role: 'confirm',
    handler: () => {
      performLogout()
    },
  },
]

// Methods
const toggleDarkMode = (event: any) => {
  isDarkMode.value = event.detail.checked
  document.body.classList.toggle('dark', isDarkMode.value)
  localStorage.setItem('darkMode', isDarkMode.value.toString())

  toastMessage.value = `Dark mode ${isDarkMode.value ? 'enabled' : 'disabled'}`
  showToast.value = true
}

const toggleNotifications = (event: any) => {
  notificationsEnabled.value = event.detail.checked
  localStorage.setItem('notificationsEnabled', notificationsEnabled.value.toString())

  toastMessage.value = `Notifications ${notificationsEnabled.value ? 'enabled' : 'disabled'}`
  showToast.value = true
}

const openLanguageSelector = () => {
  showLanguageModal.value = true
}

const closeLanguageSelector = () => {
  showLanguageModal.value = false
}

const changeLanguage = (event: any) => {
  selectedLanguage.value = event.detail.value
  localStorage.setItem('selectedLanguage', selectedLanguage.value)

  toastMessage.value = `Language changed to ${selectedLanguage.value}`
  showToast.value = true
  closeLanguageSelector()
}

const showAbout = () => {
  showAboutModal.value = true
}

const closeAbout = () => {
  showAboutModal.value = false
}

const changePassword = () => {
  toastMessage.value = 'Password change feature coming soon'
  showToast.value = true
}

const confirmLogout = () => {
  showLogoutAlert.value = true
}

const performLogout = async () => {
  try {
    await authStore.logout()
    router.replace('/login')
  } catch (error) {
    toastMessage.value = 'Failed to sign out. Please try again.'
    showToast.value = true
  }
}

// Load saved preferences on mount
onMounted(() => {
  // Load dark mode preference
  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode !== null) {
    isDarkMode.value = savedDarkMode === 'true'
    document.body.classList.toggle('dark', isDarkMode.value)
  }

  // Load notifications preference
  const savedNotifications = localStorage.getItem('notificationsEnabled')
  if (savedNotifications !== null) {
    notificationsEnabled.value = savedNotifications === 'true'
  }

  // Load language preference
  const savedLanguage = localStorage.getItem('selectedLanguage')
  if (savedLanguage) {
    selectedLanguage.value = savedLanguage
  }
})
</script>

<style scoped>
.profile-container {
  padding: 1rem;
}

.user-info-section {
  display: flex;
  align-items: center;
  padding: 2rem 1rem;
  background: var(--ion-color-light);
  border-radius: 12px;
  margin-bottom: 2rem;
}

.avatar-container {
  margin-right: 1rem;
}

.user-avatar {
  width: 80px;
  height: 80px;
}

.user-details h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.user-email {
  margin: 0 0 1rem 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.settings-list,
.account-actions {
  margin-bottom: 2rem;
}

.logout-item {
  --color: var(--ion-color-danger);
}

.about-content {
  padding: 2rem;
}

.about-info {
  text-align: center;
}

.app-logo {
  margin-bottom: 1rem;
}

.about-info h2 {
  margin: 1rem 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
}

.version {
  color: var(--ion-color-medium);
  font-size: 1rem;
  margin-bottom: 2rem;
}

.description {
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 3rem;
  color: var(--ion-color-medium);
}

.company-info {
  border-top: 1px solid var(--ion-color-light);
  padding-top: 2rem;
}

.company-info p {
  margin: 0.25rem 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
</style>
