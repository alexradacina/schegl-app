<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/assignments" text="Jobs"></ion-back-button>
        </ion-buttons>
        <ion-title>Objects List</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="assignmentsStore.isLoading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading assignment...</p>
      </div>

      <div v-else-if="!assignment" class="error-container">
        <ion-icon :icon="alertCircleOutline" size="large"></ion-icon>
        <h2>Assignment Not Found</h2>
        <p>The assignment doesn't exist or you don't have access.</p>
        <ion-button @click="goBack" fill="outline">Back to Assignments</ion-button>
      </div>

      <div v-else class="assignment-details">
        <!-- Company Header -->
        <div class="company-header">
          <h2>{{ assignment.order?.customer?.name || 'Unknown Customer' }}</h2>
          <p class="customer-id">Customer: {{ assignment.order?.customer?.id || 'N/A' }}</p>
        </div>

        <!-- Notes Section -->
        <div class="notes-section">
          <div class="notes-header">
            <ion-icon :icon="documentTextOutline"></ion-icon>
            <span>Notes</span>
          </div>
          <DrawingPreview
              v-if="assignment"
              :drawing-id="`assignment_${assignment.id}`"
          />
        </div>

        <!-- Search and Filter Bar -->
        <div class="search-filter-bar">
          <div class="search-box">
            <ion-icon :icon="searchOutline"></ion-icon>
            <input
                type="text"
                v-model="searchQuery"
                placeholder="Search"
                class="search-input"
            />
          </div>
          <div class="view-controls">
            <!-- Removed the view toggle button -->
            <ion-button fill="clear" size="small" @click="showFilterModal = true">
              <ion-icon :icon="funnelOutline"></ion-icon>
              <span>Filter ({{ activeFiltersCount }})</span>
            </ion-button>
          </div>
        </div>

        <!-- Machines List -->
        <div v-if="machinesStore.isLoading" class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading machines...</p>
        </div>
        <div v-else-if="filteredMachines.length === 0" class="empty-state">
          <ion-icon :icon="constructOutline" size="large"></ion-icon>
          <p>No machines found</p>
        </div>
        <div v-else class="machines-list">
          <div
              v-for="machine in filteredMachines"
              :key="machine.id"
              class="machine-item"
              @click="openMachineOrderModal(machine)"
          >
            <div
                class="status-indicator"
                :class="getStatusClass(getMachineOrderStatus(machine.id))"
            ></div>
            <div class="machine-info">
              <h3>{{ machine.internal_number || 'Unnamed Machine' }}</h3>
              <p class="machine-details">{{ machine.object || 'No description' }}</p>
              <p class="machine-meta" v-if="machine.producer || machine.type">
                {{ machine.producer }} {{ machine.type }}
              </p>
            </div>
            <div class="machine-actions">
              <span class="timestamp">{{ formatTime(machine.created_at) }}</span>
              <ion-button fill="outline" size="small" class="details-btn">
                Details
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Moved floating button outside of assignment-details div to be direct child of ion-content -->
      <!-- Floating Add Button -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed">
        <ion-fab-button @click="openCreateMachineModal">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Modals (v-show instead of v-if) -->
      <CreateMachineModal v-show="showCreateMachine" :is-open="showCreateMachine" :address-id="assignment?.address?.id" :customer-id="assignment?.order?.customer?.id" @close="showCreateMachine = false" @created="onMachineCreated"/>
      <MachineOrderModal v-show="showMachineOrderModal" :is-open="showMachineOrderModal" :machine="selectedMachine" :order-address-id="getOrderAddressId()" @close="showMachineOrderModal = false" @created="onMachineOrderCreated" @updated="onMachineOrderUpdated"/>
      <ion-modal :is-open="showFilterModal" @didDismiss="showFilterModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Filter</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showFilterModal = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="filter-section">
            <h3>Status</h3>
            <ion-list>
              <ion-item>
                <ion-checkbox v-model="statusFilters.all" @ionChange="toggleAllStatuses">All</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox v-model="statusFilters.todo">To Do</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox v-model="statusFilters.success">No Issues</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox v-model="statusFilters.warning">Remark</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox v-model="statusFilters.danger">Severe Issue</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox v-model="statusFilters.retired">Retired</ion-checkbox>
              </ion-item>
            </ion-list>
          </div>
          <div class="filter-actions">
            <ion-button expand="block" @click="clearFilters">Clear All</ion-button>
            <ion-button expand="block" color="primary" @click="applyFilters">Apply</ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption, IonButton, IonChip, IonSpinner, IonIcon, toastController, IonFab, IonFabButton, IonModal, IonList, IonCheckbox } from '@ionic/vue'
import { alertCircleOutline, addOutline, constructOutline, chevronForwardOutline, documentTextOutline, searchOutline, gridOutline, listOutline, funnelOutline } from 'ionicons/icons'
import { useAssignmentsStore } from '@/stores/assignments'
import { useMachinesStore } from '@/stores/machines'
import { useMachineOrdersStore } from '@/stores/machineOrders'
import CreateMachineModal from '@/components/CreateMachineModal.vue'
import MachineOrderModal from '@/components/MachineOrderModal.vue'
import DrawingPreview from '@/components/DrawingPreview.vue'

const route = useRoute()
const router = useRouter()
const assignmentsStore = useAssignmentsStore()
const machinesStore = useMachinesStore()
const machineOrdersStore = useMachineOrdersStore()

const assignment = computed(() => assignmentsStore.currentAssignment)
const selectedStatus = ref('')
const showCreateMachine = ref(false)
const showMachineOrderModal = ref(false)
const selectedMachine = ref<any>(null)
const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const showFilterModal = ref(false)
const statusFilters = ref({
  all: true,
  todo: false,
  success: false,
  warning: false,
  danger: false,
  retired: false
})
const appliedStatusFilters = ref({ ...statusFilters.value })

const addressMachines = computed(() => {
  if (!Array.isArray(machinesStore.machines) || !assignment.value?.address?.id) return []
  return machinesStore.machines.filter(machine => machine.address_id === assignment.value?.address?.id)
})

const filteredMachines = computed(() => {
  let machines = addressMachines.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    machines = machines.filter(machine =>
        machine.internal_number?.toLowerCase().includes(query) ||
        machine.object?.toLowerCase().includes(query) ||
        machine.producer?.toLowerCase().includes(query) ||
        machine.type?.toLowerCase().includes(query)
    )
  }

  // Apply status filter
  if (!appliedStatusFilters.value.all) {
    machines = machines.filter(machine => {
      const status = getMachineOrderStatus(machine.id)
      if (status === null || status === 0) return appliedStatusFilters.value.todo
      if (status === 1) return appliedStatusFilters.value.success
      if (status === 2) return appliedStatusFilters.value.warning
      if (status === 3) return appliedStatusFilters.value.danger
      if (status === 4) return appliedStatusFilters.value.retired
      return false
    })
  }

  return machines
})

const activeFiltersCount = computed(() => {
  if (appliedStatusFilters.value.all) return 0
  let count = 0
  if (appliedStatusFilters.value.todo) count++
  if (appliedStatusFilters.value.success) count++
  if (appliedStatusFilters.value.warning) count++
  if (appliedStatusFilters.value.danger) count++
  if (appliedStatusFilters.value.retired) count++
  return count
})

const goBack = () => router.push('/tabs/assignments')

const getOrderAddressId = () => assignment.value?.order_address_id || assignment.value?.id

const openMachineOrderModal = async (machine: any) => {
  selectedMachine.value = machine
  await machineOrdersStore.fetchMachineOrders() // preload
  showMachineOrderModal.value = true
}

const openCreateMachineModal = async () => {
  if (!assignment.value?.address?.id || !assignment.value?.order?.customer?.id) {
    const toast = await toastController.create({
      message: 'Missing address or customer information',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
    return
  }

  // Directly create a new machine with "New Machine" as internal number
  const machineData = {
    internal_number: 'New Machine',
    object: '',
    producer: '',
    type: '',
    serial_number: '',
    address_id: assignment.value.address.id,
    customer_id: assignment.value.order.customer.id,
  }

  const result = await machinesStore.createMachine(machineData)

  if (result.success && result.data) {
    const orderAddressId = getOrderAddressId()
    const machineOrderData = {
      machine_id: result.data.id,
      order_address_id: orderAddressId,
      status: 0, // 0 = To Do
    }

    const orderResult = await machineOrdersStore.createMachineOrder(machineOrderData)

    if (orderResult.success) {
      const toast = await toastController.create({
        message: 'Machine and order created successfully',
        duration: 2000,
        color: 'success',
      })
      await toast.present()
    } else {
      const toast = await toastController.create({
        message: 'Machine created but failed to create order',
        duration: 3000,
        color: 'warning',
      })
      await toast.present()
    }

    // Refresh machines and orders list
    await machinesStore.fetchMachines()
    await machineOrdersStore.fetchMachineOrders()

    // Immediately open Machine Order Modal with the new machine
    selectedMachine.value = result.data
    showMachineOrderModal.value = true
  } else {
    const toast = await toastController.create({
      message: result.message || 'Failed to create machine',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
  }
}

const getStatusColor = (status: string | number | null | undefined) => {
  if (!status) return 'medium'
  if (typeof status === 'number') {
    return {1:'success',2:'warning',3:'danger',4:'dark'}[status]||'medium'
  }
  return {completed:'success',in_progress:'warning',pending:'primary',cancelled:'danger',unclear:'medium'}[status.toLowerCase()]||'medium'
}

const getStatusClass = (status: number | null) => {
  if (status === null) return 'status-none'
  return {
    0: 'status-todo',
    1: 'status-success',
    2: 'status-warning',
    3: 'status-danger',
    4: 'status-retired'
  }[status] || 'status-none'
}

const getMachineOrderStatus = (machineId:number) => {
  const orderAddressId = getOrderAddressId()
  const order = machineOrdersStore.machineOrders.find(o => o.machine?.id === machineId && o.order_address_id === orderAddressId)
  return order?.status ?? null
}

const getMachineOrderStatusLabel = (machineId:number) => {
  const status = getMachineOrderStatus(machineId)
  if (status === null) return null
  return {0:'To Do',1:'No Issues',2:'Remark',3:'Severe Issue',4:'Retired'}[status] || 'Unknown'
}

const updateStatus = async () => {
  if (!assignment.value) return
  const result = await assignmentsStore.updateAssignmentStatus(assignment.value.id, selectedStatus.value)
  const toast = await toastController.create({
    message: result.success ? 'Status updated successfully' : (result.message || 'Failed to update status'),
    duration: 2000,
    color: result.success ? 'success':'danger'
  })
  await toast.present()
  if(result.success) await assignmentsStore.fetchAssignmentById(assignment.value.id)
}

const toggleView = () => {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
}

const onMachineCreated = async () => {
  showCreateMachine.value = false
  await machinesStore.fetchMachines()
}

const onMachineOrderCreated = async () => {
  showMachineOrderModal.value = false
  selectedMachine.value = null
  await machineOrdersStore.fetchMachineOrders()
}

const onMachineOrderUpdated = async () => {
  await machineOrdersStore.fetchMachineOrders()
}

const formatTime = (timestamp: string | undefined) => {
  if (!timestamp) return '10:00 AM'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const toggleAllStatuses = () => {
  if (statusFilters.value.all) {
    statusFilters.value.todo = false
    statusFilters.value.success = false
    statusFilters.value.warning = false
    statusFilters.value.danger = false
    statusFilters.value.retired = false
  } else {
    statusFilters.value.all = true
    statusFilters.value.todo = true
    statusFilters.value.success = true
    statusFilters.value.warning = true
    statusFilters.value.danger = true
    statusFilters.value.retired = true
  }
}

const clearFilters = () => {
  statusFilters.value = {
    all: true,
    todo: false,
    success: false,
    warning: false,
    danger: false,
    retired: false
  }
}

const applyFilters = () => {
  appliedStatusFilters.value = { ...statusFilters.value }
  showFilterModal.value = false
}

onMounted(async () => {
  const assignmentId = parseInt(route.params.id as string)
  await assignmentsStore.fetchAssignmentById(assignmentId)
  await machinesStore.fetchMachines()
  await machineOrdersStore.fetchMachineOrders()
  if (assignment.value) selectedStatus.value = assignment.value.status || 'unclear'
})
</script>

<style scoped>
.assignment-details {
  padding: 0;
  padding-bottom: 80px;
}

.company-header {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.company-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #000;
}

.customer-id {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: #666;
}

.notes-section {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: #000;
}

.notes-header ion-icon {
  font-size: 1.25rem;
}

.search-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.search-box ion-icon {
  color: #666;
  font-size: 1.25rem;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.view-controls ion-button {
  --padding-start: 0.5rem;
  --padding-end: 0.5rem;
}

.machines-list {
  background: white;
}

.machine-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.machine-item:hover {
  background: #f9f9f9;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-none {
  background: #e0e0e0;
  border: 2px solid #ccc;
}

.status-todo {
  background: white;
  border: 2px solid #ccc;
}

.status-success {
  background: #4caf50;
}

.status-warning {
  background: #ffc107;
}

.status-danger {
  background: #f44336;
}

.status-retired {
  background: #9e9e9e;
}

.machine-info {
  flex: 1;
  min-width: 0;
}

.machine-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #000;
}

.machine-details {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.machine-meta {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #999;
}

.machine-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.timestamp {
  font-size: 0.85rem;
  color: #999;
}

.details-btn {
  --padding-start: 1rem;
  --padding-end: 1rem;
  height: 32px;
  font-size: 0.9rem;
}

.loading-container, .error-container, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
}

.empty-state ion-icon {
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #999;
  margin: 0;
}

ion-fab-button {
  --background: #000;
  --background-activated: #333;
  --color: white;
  width: 56px;
  height: 56px;
}

.add-fab {
  margin: 0 0 16px 16px;
}

.filter-section {
  margin-bottom: 2rem;
}

.filter-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.filter-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 2rem;
}

ion-checkbox {
  margin-right: 1rem;
}

/* Updated fab button styles for proper fixed positioning */
ion-fab {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 999;
}
</style>
