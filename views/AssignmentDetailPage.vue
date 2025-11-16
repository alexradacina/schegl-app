<template>
  <ion-page>
    <ion-header>
      <ion-toolbar style="--min-height: 70px;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <ion-icon :icon="chevronBackOutline" style="font-size: 2rem;"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title style="font-size: 1.3rem; padding-left: 2rem;">
          {{ assignment?.order?.job || 'Job Details' }}
        </ion-title>
        <ion-buttons slot="end" style="margin-right: 100px;">
          <ion-button @click="toggleReadyStatus" :disabled="isUpdatingStatus">
            <ion-icon
                :icon="assignment?.order?.finished == 1 ? closeCircleOutline : checkmarkCircleOutline"
                slot="start"
            ></ion-icon>
            {{ assignment?.order?.finished == 1 ? 'Mark as Incomplete' : 'Mark as Ready' }}
          </ion-button>
        </ion-buttons>
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
        <!-- Moved company header to be first -->
        <div class="company-header">
          <div class="header-row">
            <!-- Location Icon -->
            <div class="location-icon">
              <ion-icon :icon="location"></ion-icon>
            </div>

            <!-- Customer Details (two rows) -->
            <div class="customer-details">
              <h2>{{ assignment.order?.customer?.name || 'Unknown Customer' }}</h2>
              <p class="address">
                {{ assignment.address.street }}, {{ assignment.address.postal_code }} {{ assignment.address.city }}
              </p>
            </div>

            <!-- Contact Person -->
            <div v-if="assignment.order?.contact_persons && assignment.order.contact_persons.length > 0" class="contact-person">
              <a :href="`tel:${assignment.order.contact_persons[0].phone}`" class="phone-link" @click.stop>
                {{ assignment.order.contact_persons[0].phone }}
              </a>
              <p class="contact-name">{{ assignment.order.contact_persons[0].name }}</p>
            </div>

            <!-- Tracking Time Button -->
            <div class="tracking-section">
              <ion-button
                  v-if="!trackingStore.currentTracking"
                  class="start-button"
                  @click="openTimeTrackingModal"
              >
                Start
                <ion-icon :icon="timeOutline" slot="end" />
              </ion-button>
              <ion-button
                  v-else
                  class="tracking-button"
                  :style="{ '--background': getTrackingTypeColor(trackingStore.currentTracking.type) }"
                  @click="openTimeTrackingModal"
              >
                {{ trackingStore.currentTracking.type }}<br />{{ formatCurrentTrackingTime() }}
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Moved info_technician message below company header -->
        <div v-if="assignment.order?.info_technician" class="info-message">
          <ion-icon :icon="chatbubble"></ion-icon>
          <span>{{ assignment.order.info_technician }}</span>
        </div>

        <!-- Notes Section -->
        <div class="notes-section">
          <DrawingPreview
              v-if="assignment"
              :order-id="assignment.order?.id"
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
            <ion-button fill="clear" size="small" @click="showFilterModal = true">
              <ion-icon :icon="funnelOutline"></ion-icon>
              <span>Filter ({{ activeFiltersCount }})</span>
            </ion-button>
            <!-- Added Hide inspected toggle -->
            <ion-toggle v-model="hideInspected">Hide inspected</ion-toggle>
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
              :class="getMachineBackgroundClass(machine.status)"
              @click="openMachineOrderModal(machine)"
          >
            <!-- Replaced status indicator with larger circle containing checkmark if finished -->
            <div class="completion-indicator">
              <ion-icon v-if="isMachineOrderFinished(machine.id)" :icon="checkmark" class="checkmark-icon"></ion-icon>
            </div>
            <div class="machine-info">
              <h3>{{ machine.internal_number || 'Unnamed Machine' }}</h3>
              <!-- Changed "No description" to "no details" -->
              <p class="machine-details">{{ machine.object || 'no details' }}</p>
              <p class="machine-meta" v-if="machine.producer || machine.type">
                {{ machine.producer }} {{ machine.type }}
              </p>
              <!-- Added machine status display -->
              <p class="machine-status" v-if="machine.status">
                <ion-chip :color="getMachineStatusColor(machine.status)" size="small">
                  {{ getMachineStatusLabel(machine.status) }}
                </ion-chip>
              </p>
            </div>
            <div class="machine-actions">
              <!-- Removed timestamp span and replaced Details button with arrow icon -->
              <ion-icon :icon="chevronForwardOutline" class="arrow-icon"></ion-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Add Button -->
      <ion-fab vertical="bottom" horizontal="start" slot="fixed">
        <ion-fab-button @click="openCreateMachineModal">
          <ion-icon class="add-machine" :icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Modals -->
      <CreateMachineModal v-show="showCreateMachine" :is-open="showCreateMachine" :address-id="assignment?.address?.id" :customer-id="assignment?.order?.customer?.id" @close="showCreateMachine = false" @created="onMachineCreated"/>
      <MachineOrderModal v-show="showMachineOrderModal" :is-open="showMachineOrderModal" :machine="selectedMachine" :order-id="assignment?.order?.id" :order-address-id="getOrderAddressId()" @close="showMachineOrderModal = false" @created="onMachineOrderCreated" @updated="onMachineOrderUpdated"/>

      <!-- Added TimeTrackingModal -->
      <TimeTrackingModal
          :is-open="showTimeTrackingModal"
          @close="showTimeTrackingModal = false"
      />

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
            <h3>Machine Status</h3>
            <ion-list>
              <ion-item>
                <ion-checkbox :checked="statusFilters.all" @ionChange="(e) => handleStatusChange('all', e.detail.checked)">All</ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox :checked="statusFilters.new" @ionChange="(e) => handleStatusChange('new', e.detail.checked)">
                  <ion-chip color="medium" size="small">New</ion-chip>
                </ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox :checked="statusFilters.no_issues" @ionChange="(e) => handleStatusChange('no_issues', e.detail.checked)">
                  <ion-chip color="success" size="small">No Issues</ion-chip>
                </ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox :checked="statusFilters.issues" @ionChange="(e) => handleStatusChange('issues', e.detail.checked)">
                  <ion-chip color="warning" size="small">Issues</ion-chip>
                </ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox :checked="statusFilters.severe_issues" @ionChange="(e) => handleStatusChange('severe_issues', e.detail.checked)">
                  <ion-chip color="danger" size="small">Severe Issues</ion-chip>
                </ion-checkbox>
              </ion-item>
              <ion-item>
                <ion-checkbox :checked="statusFilters.retired" @ionChange="(e) => handleStatusChange('retired', e.detail.checked)">
                  <ion-chip color="dark" size="small">Retired</ion-chip>
                </ion-checkbox>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption, IonButton, IonChip, IonSpinner, IonIcon, toastController, IonFab, IonFabButton, IonModal, IonList, IonCheckbox, IonToggle } from '@ionic/vue'
import { alertCircleOutline, add, constructOutline, chevronForwardOutline, documentTextOutline, searchOutline, gridOutline, listOutline, funnelOutline, location, timeOutline, chatbubble, checkmark, chevronBackOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons'
import { useAssignmentsStore } from '@/stores/assignments'
import { useMachinesStore } from '@/stores/machines'
import { useMachineOrdersStore } from '@/stores/machineOrders'
import { useTrackingTimesStore } from '@/stores/trackingTimes'
import CreateMachineModal from '@/components/CreateMachineModal.vue'
import MachineOrderModal from '@/components/MachineOrderModal.vue'
import DrawingPreview from '@/components/DrawingPreview.vue'
import TimeTrackingModal from '@/components/TimeTrackingModal.vue'

const route = useRoute()
const router = useRouter()
const assignmentsStore = useAssignmentsStore()
const machinesStore = useMachinesStore()
const machineOrdersStore = useMachineOrdersStore()
const trackingStore = useTrackingTimesStore()

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
  new: false,
  no_issues: false,
  issues: false,
  severe_issues: false,
  retired: false
})
const appliedStatusFilters = ref({ ...statusFilters.value })

const showTimeTrackingModal = ref(false)
const currentTime = ref(Date.now())
let timeUpdateInterval: any = null

const hideInspected = ref(false)
const isUpdatingStatus = ref(false)

const addressMachines = computed(() => {
  if (!Array.isArray(machinesStore.machines) || !assignment.value?.address?.id) return []
  return machinesStore.machines.filter(machine => machine.address_id === assignment.value?.address?.id)
})

const filteredMachines = computed(() => {
  let machines = addressMachines.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    machines = machines.filter(machine =>
        machine.internal_number?.toLowerCase().includes(query) ||
        machine.object?.toLowerCase().includes(query) ||
        machine.producer?.toLowerCase().includes(query) ||
        machine.type?.toLowerCase().includes(query)
    )
  }

  if (!appliedStatusFilters.value.all) {
    machines = machines.filter(machine => {
      const status = machine.status || 'new'
      if (status === 'new') return appliedStatusFilters.value.new
      if (status === 'no_issues') return appliedStatusFilters.value.no_issues
      if (status === 'issues') return appliedStatusFilters.value.issues
      if (status === 'severe_issues') return appliedStatusFilters.value.severe_issues
      if (status === 'retired') return appliedStatusFilters.value.retired
      return false
    })
  }

  if (hideInspected.value) {
    machines = machines.filter(machine => {
      const orderAddressId = getOrderAddressId()
      const order = machineOrdersStore.machineOrders.find(
          o => o.machine?.id === machine.id && o.order_address_id === orderAddressId
      )
      return order?.finished !== 1
    })
  }

  return machines
})

const activeFiltersCount = computed(() => {
  if (appliedStatusFilters.value.all) return 0
  let count = 0
  if (appliedStatusFilters.value.new) count++
  if (appliedStatusFilters.value.no_issues) count++
  if (appliedStatusFilters.value.issues) count++
  if (appliedStatusFilters.value.severe_issues) count++
  if (appliedStatusFilters.value.retired) count++
  return count
})

const goBack = () => router.push('/tabs/assignments')

const getOrderAddressId = () => assignment.value?.order_address_id || assignment.value?.id

const openMachineOrderModal = async (machine: any) => {
  const orderAddressId = getOrderAddressId()
  await machineOrdersStore.fetchMachineOrders()

  const existingOrder = machineOrdersStore.machineOrders.find(
      o => o.machine?.id === machine.id && o.order_address_id === orderAddressId
  )

  if (!existingOrder) {
    const machineOrderData = {
      machine_id: machine.id,
      order_address_id: orderAddressId,
      status: 0,
    }

    const orderResult = await machineOrdersStore.createMachineOrder(machineOrderData)

    if (orderResult.success) {
      await machineOrdersStore.fetchMachineOrders()
    } else {
      const toast = await toastController.create({
        message: orderResult.message || 'Failed to create machine order',
        duration: 3000,
        color: 'danger',
      })
      await toast.present()
      return
    }
  }

  selectedMachine.value = machine
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
      status: 0,
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

    await machinesStore.fetchMachines()
    await machineOrdersStore.fetchMachineOrders()

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

const handleStatusChange = (filterKey: string, checked: boolean) => {
  if (filterKey === 'all') {
    statusFilters.value.all = checked
    if (checked) {
      statusFilters.value.new = false
      statusFilters.value.no_issues = false
      statusFilters.value.issues = false
      statusFilters.value.severe_issues = false
      statusFilters.value.retired = false
    }
  } else {
    statusFilters.value[filterKey] = checked
    if (checked) {
      statusFilters.value.all = false
    }
    const anyChecked = statusFilters.value.new || statusFilters.value.no_issues ||
        statusFilters.value.issues || statusFilters.value.severe_issues ||
        statusFilters.value.retired
    if (!anyChecked) {
      statusFilters.value.all = true
    }
  }
}

const clearFilters = () => {
  statusFilters.value = {
    all: true,
    new: false,
    no_issues: false,
    issues: false,
    severe_issues: false,
    retired: false
  }
}

const applyFilters = () => {
  appliedStatusFilters.value = { ...statusFilters.value }
  showFilterModal.value = false
}

const formatCurrentTrackingTime = () => {
  if (!trackingStore.currentTracking) return ''

  const start = new Date(trackingStore.currentTracking.start_date).getTime()
  const now = Date.now()
  const totalMs = now - start

  const hours = Math.floor(totalMs / 3600000)
  const mins = Math.floor((totalMs % 3600000) / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const getTrackingTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'driving':
      return '#9b59b6'
    case 'work':
      return '#3498db'
    case 'pause':
      return '#e74c3c'
    default:
      return '#4CAF50'
  }
}

const openTimeTrackingModal = () => {
  showTimeTrackingModal.value = true
}

const getMachineBackgroundClass = (status: string | undefined) => {
  switch (status) {
    case 'new':
      return 'bg-white'
    case 'retired':
      return 'bg-light-gray'
    case 'no_issues':
      return 'bg-light-green'
    case 'issues':
      return 'bg-light-yellow'
    case 'severe_issues':
      return 'bg-light-red'
    default:
      return 'bg-white'
  }
}

const isMachineOrderFinished = (machineId: number) => {
  const orderAddressId = getOrderAddressId()
  const order = machineOrdersStore.machineOrders.find(
      o => o.machine?.id === machineId && o.order_address_id === orderAddressId
  )
  return order?.finished === 1
}

const toggleReadyStatus = async () => {
  if (!assignment.value || isUpdatingStatus.value) return

  isUpdatingStatus.value = true
  const newFinishedValue = assignment.value.order?.finished == 1 ? 0 : 1

  const result = await assignmentsStore.updateAssignmentStatus(assignment.value.id, newFinishedValue)

  if (result.success) {
    const toast = await toastController.create({
      message: newFinishedValue === 1 ? 'Marked as ready' : 'Marked as incomplete',
      duration: 2000,
      color: 'success',
    })
    await toast.present()
  } else {
    const toast = await toastController.create({
      message: result.message || 'Failed to update status',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
  }

  isUpdatingStatus.value = false
}

onMounted(async () => {
  const assignmentId = parseInt(route.params.id as string)
  await assignmentsStore.fetchAssignmentById(assignmentId)
  await machinesStore.fetchMachines()
  await machineOrdersStore.fetchMachineOrders()

  const today = new Date().toISOString().split('T')[0]
  await trackingStore.fetchTrackingTimes(today)

  if (assignment.value) selectedStatus.value = assignment.value.status || 'unclear'

  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

const getMachineStatusColor = (status: string) => {
  switch (status) {
    case 'new':
      return 'medium'
    case 'no_issues':
      return 'success'
    case 'issues':
      return 'warning'
    case 'severe_issues':
      return 'danger'
    case 'retired':
      return 'dark'
    default:
      return 'medium'
  }
}

const getMachineStatusLabel = (status: string) => {
  switch (status) {
    case 'new':
      return 'New'
    case 'no_issues':
      return 'No Issues'
    case 'issues':
      return 'Issues'
    case 'severe_issues':
      return 'Severe Issues'
    case 'retired':
      return 'Retired'
    default:
      return status
  }
}
</script>

<style scoped>
.assignment-details {
  padding: 0;
  padding-bottom: 80px;
}

.info-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fffacd;
  border-bottom: 1px solid #f0e68c;
  margin-left: -16px;
  margin-right: -16px;
  margin-top: 0;
  margin-bottom: 0;
}

.info-message ion-icon {
  font-size: 1.8rem;
  color: #000;
  flex-shrink: 0;
}

.info-message span {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
  line-height: 1.4;
}

.company-header {
  padding: 1rem;
  background: var(--ion-color-light);
  border-bottom: 1px solid #c0c0c0;
  margin-left: -16px;
  margin-right: -16px;
  margin-top: -16px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.location-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: #000;
}

.customer-details {
  flex: 1;
  min-width: 0;
}

.customer-details h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.customer-details .address {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-person {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.phone-link {
  color: #007bff;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
}

.phone-link:hover {
  text-decoration: underline;
}

.contact-name {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.tracking-section {
  display: flex;
  align-items: center;
}

.start-button {
  --background: #4CAF50;
  --background-hover: #45a049;
  --background-activated: #45a049;
  --color: white;
  --border-radius: 8px;
  font-weight: 600;
  text-transform: none;
  height: 48px;
}

.tracking-button {
  --color: white;
  --border-radius: 8px;
  font-weight: 600;
  text-transform: capitalize;
  height: 48px;
  white-space: pre-line;
  line-height: 1.2;
  font-size: 0.85rem;
}

.customer-id {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: #666;
}

.notes-section {
  padding: 0 0 0 1rem;
  background: white;
  margin-left: -16px;
  margin-right: -16px;
}

.search-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  margin-left: -16px;
  margin-right: -16px;
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
  margin-left: -16px;
  margin-right: -16px;
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
  filter: brightness(0.95);
}

.completion-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ccc;
  background: white;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkmark-icon {
  font-size: 20px;
  color: #4caf50;
  font-weight: bold;
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

.machine-status {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #999;
}

.machine-actions {
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-icon {
  font-size: 1.5rem;
  color: #666;
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

ion-fab {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 999;
}

ion-icon.add-machine {
  font-size: 36px;
  font-weight: bolder;
}

.bg-white {
  background: white;
}

.bg-light-gray {
  background: #e0e0e0;
}

.bg-light-green {
  background: #d4edda;
}

.bg-light-yellow {
  background: #fff3cd;
}

.bg-light-red {
  background: #f8d7da;
}
</style>
