<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" class="time-tracking-modal">
    <ion-header>
      <ion-toolbar>
        <ion-title>Time Tracking</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleClose">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="time-tracking-content">
      <!-- Total time today -->
      <div class="total-time-header">
        <div class="total-time">
          <span class="label">Total Time today:</span>
          <span class="time">{{ totalTimeToday }}</span>
        </div>
        <ion-button
            v-if="hasUnsyncedItems"
            fill="clear"
            size="small"
            color="warning"
            @click="syncNow"
        >
          <ion-icon :icon="syncOutline" slot="start" />
          Sync ({{ unsyncedCount }})
        </ion-button>
      </div>

      <!-- Current tracking controls -->
      <div class="tracking-controls">
        <!-- Current timer display -->
        <div v-if="isTracking" class="current-timer">
          <div class="timer-badge" :class="`timer-${currentType}`">
            {{ currentDuration }}
          </div>
          <div class="next-label">Next:</div>
        </div>

        <!-- Type buttons -->
        <div class="type-buttons">
          <ion-button
              v-for="type in types"
              :key="type.value"
              :class="['type-button', `type-${type.value}`, { active: selectedType === type.value }]"
              @click="selectType(type.value)"
          >
            {{ type.label }}
          </ion-button>
        </div>

        <!-- Address selection -->
        <ion-item lines="none" class="address-select">
          <ion-label position="stacked">Assignment Address</ion-label>
          <ion-select
              v-model="selectedAssignmentId"
              placeholder="Select address (optional)"
              interface="action-sheet"
          >
            <ion-select-option :value="null">None</ion-select-option>
            <ion-select-option
                v-for="assignment in availableAssignments"
                :key="assignment.id"
                :value="assignment.id"
            >
              {{ formatAssignmentOption(assignment) }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Warning for work without address -->
        <div v-if="showWorkWarning" class="work-warning">
          <ion-icon :icon="warningOutline" />
          <span>You may select an address for tracking work time</span>
        </div>

        <!-- Description -->
        <ion-item lines="none" class="description-input">
          <ion-label position="stacked">Description (optional)</ion-label>
          <ion-input
              v-model="description"
              placeholder="Enter description..."
          />
        </ion-item>

        <!-- Action buttons -->
        <div class="action-buttons">
          <ion-button
              v-if="!isTracking"
              expand="block"
              color="success"
              @click="handleStart"
          >
            <ion-icon :icon="playOutline" slot="start" />
            Start
          </ion-button>

          <template v-else>
            <ion-button
                expand="block"
                color="primary"
                :disabled="!hasChanges"
                @click="handleUpdate"
            >
              <ion-icon :icon="refreshOutline" slot="start" />
              Update
            </ion-button>

            <ion-button
                expand="block"
                color="danger"
                @click="handleStop"
            >
              <ion-icon :icon="stopOutline" slot="start" />
              Stop
            </ion-button>
          </template>
        </div>
      </div>

      <!-- Today's tracking list -->
      <div class="tracking-list">
        <h3>Today's Tracking</h3>

        <div v-if="trackingTimes.length === 0" class="empty-list">
          <ion-icon :icon="timeOutline" size="large" color="medium" />
          <p>No tracking times for today</p>
        </div>

        <div
            v-for="tracking in trackingTimes"
            :key="tracking.id || tracking.start_date"
            class="tracking-item"
        >
          <div class="item-row-1">
            <div class="item-time-range">
              <span class="start-time">{{ formatTime(tracking.start_date) }}</span>
              <span class="separator">•</span>
              <span class="tracking-type" :class="`type-${tracking.type}`">{{ tracking.type }}</span>
            </div>
            <ion-button
                fill="clear"
                size="small"
                color="danger"
                class="item-delete"
                @click="handleDelete(tracking.id!)"
            >
              <ion-icon :icon="trashOutline" slot="icon-only" />
            </ion-button>
          </div>

          <div v-if="tracking.address || tracking.description" class="item-row-2">
            <div v-if="tracking.address" class="item-address">
              {{ tracking.address.street }}, {{ tracking.address.postal_code }} {{ tracking.address.city }}
            </div>
            <div v-if="tracking.description" class="item-description">{{ tracking.description }}</div>
          </div>

          <div class="item-row-3">
            <div class="item-duration">{{ tracking.formatted_duration || calculateDuration(tracking) }}</div>
            <div v-if="!tracking.synced" class="unsynced-badge">
              <ion-icon :icon="syncOutline" />
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
} from '@ionic/vue'
import {
  closeOutline,
  playOutline,
  stopOutline,
  refreshOutline,
  syncOutline,
  warningOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons'
import { ref, computed, watch, onMounted } from 'vue'
import { useTrackingTimesStore } from '@/stores/trackingTimes'
import { useAssignmentsStore } from '@/stores/assignments'
import { useTimeTracking } from '@/composables/useTimeTracking'
import { useOfflineStorage } from '@/composables/useOfflineStorage'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const trackingStore = useTrackingTimesStore()
const assignmentsStore = useAssignmentsStore()
const { startTracking, stopTracking, updateAndRestart } = useTimeTracking()
const { getOfflineQueue } = useOfflineStorage()

const types = [
  { value: 'driving', label: 'Drive' },
  { value: 'work', label: 'Work' },
  { value: 'pause', label: 'Pause' },
]

const selectedType = ref<'driving' | 'work' | 'pause'>('driving')
const selectedAssignmentId = ref<number | null>(null)
const description = ref('')
const currentDuration = ref('0h 0m 0s')
const durationInterval = ref<number | null>(null)
const unsyncedCount = ref(0)
const hasUnsyncedItems = ref(false)
const totalSeconds = ref(0)

const trackingTimes = computed(() => trackingStore.trackingTimes)
const currentTracking = computed(() => trackingStore.currentTracking)
const isTracking = computed(() => currentTracking.value !== null)
const currentType = computed(() => currentTracking.value?.type || 'driving')

const availableAssignments = computed(() => assignmentsStore.assignments)

const totalTimeToday = computed(() => {
  let total = trackingTimes.value.reduce((sum, t) => {
    return sum + (t.duration_minutes || 0)
  }, 0) * 60 // Convert to seconds

  // Add current tracking time
  if (isTracking.value) {
    total += totalSeconds.value
  }

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const showWorkWarning = computed(() => {
  return isTracking.value && selectedType.value === 'work' && !selectedAssignmentId.value
})

const hasChanges = computed(() => {
  if (!currentTracking.value) return false

  return (
      selectedType.value !== currentTracking.value.type ||
      selectedAssignmentId.value !== currentTracking.value.assignment_id ||
      description.value !== (currentTracking.value.description || '')
  )
})

const formatAssignmentOption = (assignment: any) => {
  if (!assignment.address) return 'Unknown address'
  return `${assignment.order?.customer?.name || 'No customer'} - ${assignment.address.street}, ${assignment.address.city}`
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const calculateDuration = (tracking: any) => {
  if (!tracking.start_date) return '0s'

  const start = new Date(tracking.start_date)
  const end = tracking.end_date ? new Date(tracking.end_date) : new Date()
  const diff = end.getTime() - start.getTime()
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const updateCurrentDuration = () => {
  if (currentTracking.value && currentTracking.value.start_date) {
    const start = new Date(currentTracking.value.start_date)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    totalSeconds.value = Math.floor(diff / 1000)

    const hours = Math.floor(totalSeconds.value / 3600)
    const minutes = Math.floor((totalSeconds.value % 3600) / 60)
    const seconds = totalSeconds.value % 60

    if (hours > 0) {
      currentDuration.value = `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      currentDuration.value = `${minutes}m ${seconds}s`
    } else {
      currentDuration.value = `${seconds}s`
    }
  }
}

const selectType = (type: 'driving' | 'work' | 'pause') => {
  selectedType.value = type
}

const handleStart = async () => {
  const result = await startTracking({
    type: selectedType.value,
    assignment_id: selectedAssignmentId.value,
    description: description.value || null,
  })

  if (result.success) {
    startDurationTimer()
  }
}

const handleStop = async () => {
  if (currentTracking.value?.id) {
    await stopTracking(currentTracking.value.id)
    stopDurationTimer()
  }
}

const handleUpdate = async () => {
  if (currentTracking.value?.id && hasChanges.value) {
    await updateAndRestart(currentTracking.value.id, {
      type: selectedType.value,
      assignment_id: selectedAssignmentId.value,
      description: description.value || null,
    })
  }
}

const handleDelete = async (id: number) => {
  await trackingStore.deleteTrackingTime(id)
}

const handleClose = () => {
  emit('close')
}

const syncNow = async () => {
  // Trigger sync via offline sync composable
  // This will be handled by the global sync mechanism
}

const checkUnsyncedItems = async () => {
  const queue = await getOfflineQueue()
  unsyncedCount.value = queue.filter(item => !item.synced).length
  hasUnsyncedItems.value = unsyncedCount.value > 0
}

const startDurationTimer = () => {
  updateCurrentDuration()
  durationInterval.value = window.setInterval(updateCurrentDuration, 1000)
}

const stopDurationTimer = () => {
  if (durationInterval.value) {
    clearInterval(durationInterval.value)
    durationInterval.value = null
  }
}

const today = new Date().toISOString().split('T')[0]

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await trackingStore.fetchTrackingTimes(today)
    await checkUnsyncedItems()

    // Load current tracking state
    if (currentTracking.value) {
      selectedType.value = currentTracking.value.type
      selectedAssignmentId.value = currentTracking.value.assignment_id
      description.value = currentTracking.value.description || ''
      startDurationTimer()
    }
  } else {
    stopDurationTimer()
  }
})

onMounted(async () => {
  if (props.isOpen) {
    await trackingStore.fetchTrackingTimes(today)
    await checkUnsyncedItems()
  }
})
</script>

<style scoped>
.time-tracking-modal {
  --z-index: 10000;
}

.time-tracking-modal::part(backdrop) {
  background: rgba(0, 0, 0, 0.5);
}

.time-tracking-content {
  --background: #f5f5f5;
}

.total-time-header {
  background: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.total-time {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.total-time .label {
  font-size: 0.85rem;
  color: #666;
}

.total-time .time {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
}

.tracking-controls {
  background: white;
  padding: 1rem;
  margin-bottom: 1rem;
}

.current-timer {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.timer-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 1.1rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timer-badge::before {
  content: '●';
  animation: pulse 1.5s ease-in-out infinite;
}

.timer-driving {
  background: #9b59b6;
}

.timer-work {
  background: #3498db;
}

.timer-pause {
  background: #e74c3c;
}

.next-label {
  font-size: 0.9rem;
  color: #666;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.type-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-button {
  flex: 1;
  --border-radius: 8px;
  --padding-top: 0.75rem;
  --padding-bottom: 0.75rem;
  text-transform: capitalize;
  font-weight: 600;
}

.type-button.type-driving {
  --background: #f3e5f5;
  --color: #9b59b6;
}

.type-button.type-driving.active {
  --background: #9b59b6;
  --color: white;
}

.type-button.type-work {
  --background: #e3f2fd;
  --color: #3498db;
}

.type-button.type-work.active {
  --background: #3498db;
  --color: white;
}

.type-button.type-pause {
  --background: #ffebee;
  --color: #e74c3c;
}

.type-button.type-pause.active {
  --background: #e74c3c;
  --color: white;
}

.address-select,
.description-input {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 1rem;
}

.work-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #ffebee;
  border-radius: 8px;
  color: #e74c3c;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-buttons ion-button {
  --border-radius: 8px;
  font-weight: 600;
}

.tracking-list {
  background: white;
  padding: 1rem;
}

.tracking-list h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
  color: #999;
}

.tracking-item {
  position: relative;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background: white;
}

.item-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.item-time-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  padding-right: 2.5rem; /* Space for delete button */
}

.start-time {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
}

.separator {
  color: #ccc;
}

.tracking-type {
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.tracking-type.type-driving {
  background: #f3e5f5;
  color: #9b59b6;
}

.tracking-type.type-work {
  background: #e3f2fd;
  color: #3498db;
}

.tracking-type.type-pause {
  background: #ffebee;
  color: #e74c3c;
}

.item-delete {
  position: absolute;
  top: 0.5rem;
  right: 0.25rem;
  margin: 0;
  --padding-start: 0.5rem;
  --padding-end: 0.5rem;
}

.item-row-2 {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.item-address {
  color: #555;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.item-description {
  color: #777;
  font-style: italic;
}

.item-row-3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-duration {
  font-weight: 700;
  color: #2c3e50;
  font-size: 0.95rem;
}

.unsynced-badge {
  display: flex;
  align-items: center;
  color: #ff9800;
  font-size: 0.85rem;
}

.unsynced-badge ion-icon {
  font-size: 1rem;
}
</style>
