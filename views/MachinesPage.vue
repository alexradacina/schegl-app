<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Machines</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openCreateModal">
            <ion-icon :icon="addOutline" />
          </ion-button>
          <ion-button @click="refreshMachines">
            <ion-icon :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="machinesStore.isLoading && machinesStore.machines.length === 0" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading machines...</p>
      </div>

      <div v-else-if="machinesStore.machines.length === 0" class="empty-state">
        <ion-icon :icon="constructOutline" size="large" color="medium"></ion-icon>
        <h2>No Machines</h2>
        <p>No machines found. Create your first machine.</p>
        <ion-button fill="outline" @click="openCreateModal">
          <ion-icon :icon="addOutline" slot="start" />
          Create Machine
        </ion-button>
      </div>

      <ion-list v-else>
        <ion-item v-for="machine in machinesStore.machines" :key="machine.id">
          <div class="machine-content">
            <div class="machine-header">
              <h3>{{ machine.name }}</h3>
              <div class="header-badges">
                <ion-badge color="primary">{{ machine.serial_number }}</ion-badge>
                <!-- Added sync status badge -->
                <ion-badge 
                  :color="getSyncStatusColor(machine)"
                  v-if="machinesStore.getMachineSyncStatus(machine) !== 'saved'"
                >
                  {{ getSyncStatusLabel(machine) }}
                </ion-badge>
              </div>
            </div>
            <div class="machine-details">
              <p class="customer">{{ machine.customer?.name || 'No Customer' }}</p>
              <p v-if="machine.address" class="address">
                {{ machine.address.street }}, {{ machine.address.city }}
              </p>
              <p v-if="machine.description" class="description">{{ machine.description }}</p>
              <!-- Added button to open drawing modal with composed ID -->
              <div class="machine-actions" v-if="machine.order_id">
                <ion-button size="small" fill="outline" @click="openDrawing(machine)">
                  <ion-icon :icon="brushOutline" slot="start" />
                  Open Drawing
                </ion-button>
              </div>
            </div>
          </div>
        </ion-item>
      </ion-list>

      <CreateMachineModal
        :is-open="showCreateModal"
        @close="showCreateModal = false"
        @created="onMachineCreated"
      />

      <!-- Added DrawingModal with composed ID -->
      <DrawingModal
        :is-open="showDrawingModal"
        :drawing-id="currentDrawingId"
        @close="showDrawingModal = false"
      />

      <ion-toast
        :is-open="showToast"
        :message="toastMessage"
        :duration="3000"
        :color="toastColor"
        @didDismiss="showToast = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonBadge,
  IonToast,
} from '@ionic/vue'
import { 
  constructOutline, 
  addOutline, 
  refreshOutline,
  brushOutline,
} from 'ionicons/icons'
import { ref, onMounted } from 'vue'
import { useMachinesStore } from '@/stores/machines'
import CreateMachineModal from '@/components/CreateMachineModal.vue'
import DrawingModal from '@/components/DrawingModal.vue'

const machinesStore = useMachinesStore()

const showCreateModal = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')
const showDrawingModal = ref(false)
const currentDrawingId = ref('')

const openCreateModal = () => {
  showCreateModal.value = true
}

const refreshMachines = async () => {
  await machinesStore.fetchMachines()
  if (machinesStore.error) {
    toastMessage.value = machinesStore.error
    toastColor.value = 'danger'
    showToast.value = true
  }
}

const handleRefresh = async (event: any) => {
  await refreshMachines()
  event.target.complete()
}

const onMachineCreated = () => {
  showCreateModal.value = false
  toastMessage.value = 'Machine created successfully'
  toastColor.value = 'success'
  showToast.value = true
  refreshMachines()
}

const getSyncStatusColor = (machine: any) => {
  const status = machinesStore.getMachineSyncStatus(machine)
  switch (status) {
    case 'pending':
      return 'warning'
    case 'synced':
      return 'success'
    default:
      return 'medium'
  }
}

const getSyncStatusLabel = (machine: any) => {
  const status = machinesStore.getMachineSyncStatus(machine)
  switch (status) {
    case 'pending':
      return 'Pending Sync'
    case 'synced':
      return 'Synced'
    default:
      return 'Saved'
  }
}

const openDrawing = (machine: any) => {
  // Compose ID from order_id + machine_id
  currentDrawingId.value = `${machine.order_id}_${machine.id}`
  showDrawingModal.value = true
}

onMounted(() => {
  refreshMachines()
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  padding: 2rem;
}

.empty-state h2 {
  margin: 1rem 0 0.5rem 0;
  color: var(--ion-color-medium);
}

.empty-state p {
  color: var(--ion-color-medium);
  margin: 0 0 2rem 0;
}

.machine-content {
  flex: 1;
  padding: 0.5rem 0;
}

.machine-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.machine-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

/* Added header badges container */
.header-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.machine-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.customer {
  font-weight: 500;
  color: var(--ion-color-dark) !important;
}

.description {
  font-style: italic;
}

/* Added machine actions styles */
.machine-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}
</style>
