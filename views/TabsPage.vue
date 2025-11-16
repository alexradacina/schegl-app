<template>
  <ion-page>
    <ion-tabs>
      <!-- Restored slot to bottom, removed fixed positioning that was causing issues -->
      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <ion-tab-button
            tab="assignments"
            href="/tabs/assignments"
            :disabled="showTimeTracking"
        >
          <ion-icon :icon="map" />
          <ion-label>Tour</ion-label>
        </ion-tab-button>

        <ion-tab-button
            tab="profile"
            href="/tabs/profile"
            :disabled="showTimeTracking"
        >
          <ion-icon :icon="person" />
          <ion-label>Profile</ion-label>
        </ion-tab-button>

        <ion-tab-button
            type="button"
            @click.prevent.stop="openTimeTracking"
        >
          <ion-icon :icon="time" />
          <ion-label>Time</ion-label>
        </ion-tab-button>

        <div class="tab-logo">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_schlegl-0A1BLRnkLqnrs3o43uHT7O32eanI6R.png" alt="Schlegl Logo" />
        </div>
      </ion-tab-bar>

      <ion-router-outlet />
    </ion-tabs>

    <TimeTrackingModal
        :is-open="showTimeTracking"
        @close="showTimeTracking = false"
    />

    <ion-toast
        :is-open="showToast"
        :message="toastMessage"
        :duration="3000"
        :color="toastColor"
        @didDismiss="showToast = false"
    />

    <div class="network-status" :class="{ offline: !isOnline, syncing: isSyncing }">
      <ion-icon :icon="wifiOutline" />
      <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
      <ion-badge v-if="pendingSync > 0" color="warning">{{ pendingSync }}</ion-badge>
      <ion-spinner v-if="isSyncing" name="crescent" class="sync-spinner"></ion-spinner>
      <ion-button
          v-if="pendingSync > 0"
          size="small"
          fill="clear"
          @click="handleManualSync"
          class="sync-button"
      >
        Sync
      </ion-button>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonRouterOutlet,
  IonLabel,
  IonIcon,
  IonBadge,
  IonButton,
  IonSpinner,
  IonToast,
} from '@ionic/vue'
import { map, person, time, wifiOutline } from 'ionicons/icons'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import { useOfflineSync } from '@/composables/useOfflineSync'
import { useMachinesStore } from '@/stores/machines'
import { useAssignmentsStore } from '@/stores/assignments'
import { ref, onMounted } from 'vue'
import TimeTrackingModal from '@/components/TimeTrackingModal.vue'

const { isOnline, onOnline } = useNetworkStatus()
const { getOfflineQueue } = useOfflineStorage()
const { syncOfflineData, isSyncing } = useOfflineSync()
const machinesStore = useMachinesStore()
const assignmentsStore = useAssignmentsStore()

const pendingSync = ref(0)
const showTimeTracking = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')

const updatePendingCount = async () => {
  const queue = await getOfflineQueue()
  pendingSync.value = queue.filter(item => !item.synced).length
  console.log('[v0] Pending sync count updated:', pendingSync.value)
}

const handleManualSync = async () => {
  console.log('[v0] Manual sync button clicked')
  console.log('[v0] isOnline:', isOnline.value)
  console.log('[v0] isSyncing:', isSyncing.value)
  console.log('[v0] pendingSync:', pendingSync.value)

  if (!isOnline.value) {
    console.log('[v0] Cannot sync: offline')
    toastMessage.value = 'Cannot sync while offline'
    toastColor.value = 'warning'
    showToast.value = true
    return
  }

  if (isSyncing.value) {
    console.log('[v0] Cannot sync: already syncing')
    return
  }

  console.log('[v0] Starting manual sync...')
  const result = await syncOfflineData()
  console.log('[v0] Sync result:', result)

  if (result.success) {
    toastMessage.value = result.message || 'All items synced successfully'
    toastColor.value = 'success'

    console.log('[v0] Refreshing data from server...')
    try {
      await Promise.all([
        machinesStore.fetchMachines(),
        assignmentsStore.fetchAssignments()
      ])
      console.log('[v0] Data refreshed successfully')

      // Remove synced offline machines
      await machinesStore.removeSyncedOfflineMachines()
      console.log('[v0] Synced offline machines removed')
    } catch (error) {
      console.error('[v0] Error refreshing data:', error)
    }
  } else {
    toastMessage.value = result.message || 'Sync failed'
    toastColor.value = 'danger'
  }

  showToast.value = true
  await updatePendingCount()
}

const openTimeTracking = () => {
  showTimeTracking.value = true
}

const autoSync = async () => {
  console.log('[v0] Network stable after delay, checking for pending items')
  await updatePendingCount()

  if (pendingSync.value > 0) {
    console.log('[v0] Starting auto-sync after network reconnection')
    const result = await syncOfflineData()
    console.log('[v0] Auto-sync result:', result)

    if (result.success) {
      console.log('[v0] Auto-sync completed successfully')

      // Refresh data from server after successful sync
      try {
        await Promise.all([
          machinesStore.fetchMachines(),
          assignmentsStore.fetchAssignments()
        ])
        console.log('[v0] Data refreshed after auto-sync')

        // Remove synced offline machines
        await machinesStore.removeSyncedOfflineMachines()
        console.log('[v0] Synced offline machines removed after auto-sync')

        toastMessage.value = 'Synced successfully'
        toastColor.value = 'success'
        showToast.value = true
      } catch (error) {
        console.error('[v0] Error refreshing data after auto-sync:', error)
      }
    } else {
      console.error('[v0] Auto-sync failed:', result.message)
      toastMessage.value = 'Sync failed: ' + result.message
      toastColor.value = 'warning'
      showToast.value = true
    }

    await updatePendingCount()
  }
}

onMounted(() => {
  console.log('[v0] TabsPage mounted')
  updatePendingCount()
  // Update pending count every 30 seconds
  setInterval(updatePendingCount, 30000)
})

// Ensure all hooks are called at the top level
onOnline(autoSync)
</script>

<style scoped>
/* Removed fixed positioning, using Ionic's default bottom positioning */
.custom-tab-bar {
  padding: 0;
  background: #f8f8f8;
  border-top: 1px solid #e0e0e0;
  border-bottom: none;
  display: flex;
  align-items: center;
  height: 70px;
  /* Ensure tab bar stays fixed at bottom without causing layout shifts */
  position: sticky;
  bottom: 0;
  z-index: 1000;
}

.custom-tab-bar ion-tab-button {
  --background: transparent;
  --background-focused: transparent;
  --color: #333;
  --color-selected: #333;
  --ripple-color: transparent;
  flex: 0 0 auto;
  min-width: 130px;
  max-width: 130px;
  height: 100%;
  margin: 0;
  padding: 0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.custom-tab-bar ion-tab-button:first-child {
  margin-left: 16px;
}

.custom-tab-bar ion-tab-button.tab-selected::before,
.custom-tab-bar ion-tab-button:not(.force-inactive):hover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 115px;
  height: 54px;
  background: #b3e5f0;
  border-radius: 8px;
  z-index: 0;
  transition: background 0.2s ease;
}

.custom-tab-bar ion-tab-button:not(.force-inactive):hover::before {
  background: #d9f2f7;
}

.custom-tab-bar ion-tab-button.force-inactive {
  pointer-events: none;
  opacity: 1;
}

.custom-tab-bar ion-icon {
  font-size: 28px;
  margin-bottom: 4px;
  color: #333;
  position: relative;
  z-index: 1;
}

.custom-tab-bar ion-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  position: relative;
  z-index: 1;
}

.tab-logo {
  margin-left: auto;
  padding-right: 16px;
  display: flex;
  align-items: center;
  height: 100%;
}

.tab-logo img {
  height: 45px;
  width: auto;
  object-fit: contain;
}

.network-status {
  position: absolute;
  top: 4px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--ion-color-success);
  color: white;
  font-size: 11px;
  font-weight: 600;
  z-index: 10;
  transition: all 0.3s ease;
}

.network-status.offline {
  background: var(--ion-color-danger);
}

.network-status.syncing {
  background: var(--ion-color-primary);
}

.network-status ion-icon {
  font-size: 14px;
}

.network-status ion-badge {
  margin-left: 4px;
}

.sync-spinner {
  width: 14px;
  height: 14px;
  margin-left: 4px;
}

.sync-button {
  --padding-start: 4px;
  --padding-end: 4px;
  height: 20px;
  font-size: 10px;
  margin-left: 4px;
}
</style>
