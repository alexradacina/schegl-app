<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Tourr</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="downloadRoutePlan" :disabled="isDownloading">
            <ion-icon :icon="downloadOutline" />
          </ion-button>
          <ion-button @click="refreshAssignments">
            <ion-icon :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <!-- Redesigned header with date range and greeting -->
      <div class="tour-header">
        <div class="date-selector" @click="openDatePicker">
          <span class="date-range">{{ dateRangeFormatted }}</span>
          <ion-icon :icon="chevronDownOutline" />
        </div>
        <div class="greeting">
          <p>{{ greeting }}</p>
        </div>
      </div>

      <!-- Date picker modal -->
      <ion-modal :is-open="showDatePicker" @didDismiss="showDatePicker = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Select Date Range</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showDatePicker = false">Done</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item button @click="selectDateRange('today')">
              <ion-label>Today</ion-label>
              <ion-icon v-if="dateRangeType === 'today'" :icon="checkmarkOutline" slot="end" color="primary" />
            </ion-item>
            <ion-item button @click="selectDateRange('week')">
              <ion-label>This Week</ion-label>
              <ion-icon v-if="dateRangeType === 'week'" :icon="checkmarkOutline" slot="end" color="primary" />
            </ion-item>
            <ion-item button @click="selectDateRange('custom')">
              <ion-label>Custom Range</ion-label>
              <ion-icon v-if="dateRangeType === 'custom'" :icon="checkmarkOutline" slot="end" color="primary" />
            </ion-item>
          </ion-list>

          <div v-if="dateRangeType === 'custom'" class="custom-date-range">
            <!-- Added professional header and improved layout for custom date range -->
            <div class="custom-range-header">
              <ion-icon :icon="calendarOutline" />
              <span>Select Custom Date Range</span>
            </div>

            <div class="date-inputs">
              <div class="date-input-card">
                <ion-item lines="none">
                  <ion-label position="stacked" class="date-label">From Date</ion-label>
                  <ion-datetime-button datetime="from-datetime"></ion-datetime-button>
                  <ion-modal :keep-contents-mounted="true">
                    <ion-datetime
                        id="from-datetime"
                        presentation="date"
                        :value="dateRange.from"
                        @ionChange="onFromDateChange"
                    ></ion-datetime>
                  </ion-modal>
                </ion-item>
              </div>

              <div class="date-separator">
                <ion-icon :icon="chevronForwardOutline" />
              </div>

              <div class="date-input-card">
                <ion-item lines="none">
                  <ion-label position="stacked" class="date-label">To Date</ion-label>
                  <ion-datetime-button datetime="to-datetime"></ion-datetime-button>
                  <ion-modal :keep-contents-mounted="true">
                    <ion-datetime
                        id="to-datetime"
                        presentation="date"
                        :value="dateRange.to"
                        @ionChange="onToDateChange"
                    ></ion-datetime>
                  </ion-modal>
                </ion-item>
              </div>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="assignmentsStore.isLoading && assignmentsStore.assignments.length === 0" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading assignments...</p>
      </div>

      <div v-else-if="assignmentsStore.assignments.length === 0" class="empty-state">
        <ion-icon :icon="listOutline" size="large" color="medium"></ion-icon>
        <h2>No Assignments</h2>
        <p>You don't have any route assignments for the selected period.</p>
      </div>

      <!-- Redesigned assignment list to match reference image -->
      <div v-else class="assignments-list">
        <ion-list>
          <ion-item
              v-for="assignment in sortedAssignments"
              :key="assignment.id"
              class="assignment-item"
              lines="full"
          >
            <div class="assignment-row">
              <!-- Time -->
              <div class="assignment-time">
                {{ formatTime(assignment.scheduled_time) || '--:--' }}
              </div>

              <!-- Company Logo Placeholder -->
              <div class="company-logo">
                <ion-icon :icon="businessOutline" />
              </div>

              <!-- Company Details -->
              <div class="company-details">
                <h3>{{ assignment.order?.customer?.name || 'No Customer' }}</h3>
                <p v-if="assignment.address" class="address">
                  {{ assignment.address.street }}, {{ assignment.address.postal_code }} {{ assignment.address.city }}
                </p>
              </div>

              <!-- Item Count -->
              <div class="item-count">
                {{ assignment.number_of_items || 0 }}
              </div>

              <!-- Distance Placeholder -->
              <div class="distance">
                --°
              </div>

              <!-- Route Button -->
              <ion-button fill="outline" size="small" @click.stop="showRoute(assignment)">
                Route
              </ion-button>

              <!-- Arrow -->
              <ion-icon :icon="chevronForwardOutline" class="arrow-icon" @click="viewAssignment(assignment.id)" />
            </div>
          </ion-item>
        </ion-list>
      </div>

      <ion-toast
          :is-open="showToast"
          :message="toastMessage"
          :duration="3000"
          @didDismiss="showToast = false"
      ></ion-toast>
    </ion-content>

    <!-- Route detail modal -->
    <RouteDetailModal
        :is-open="showRouteModal"
        :assignment="selectedAssignment"
        @close="showRouteModal = false"
    />
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
  IonChip,
  IonLabel,
  IonDatetime,
  IonDatetimeButton,
  IonSegment,
  IonSegmentButton,
  IonModal,
} from '@ionic/vue'
import {
  listOutline,
  refreshOutline,
  chevronForwardOutline,
  chatbubbleEllipsesOutline,
  calendarOutline,
  downloadOutline,
  chevronDownOutline,
  checkmarkOutline,
  businessOutline
} from 'ionicons/icons'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAssignmentsStore } from '@/stores/assignments'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import RouteDetailModal from '@/components/RouteDetailModal.vue'

const router = useRouter()
const assignmentsStore = useAssignmentsStore()
const { saveOfflineFile } = useOfflineStorage()

const showToast = ref(false)
const toastMessage = ref('')
const dateRangeType = ref('today')
const isDownloading = ref(false)
const showDatePicker = ref(false)
const showRouteModal = ref(false)
const selectedAssignment = ref<any>(null)
const greeting = ref('')
const dateRangeFormatted = ref('')

// Get current week dates
const getCurrentWeek = () => {
  const today = new Date()
  const currentDay = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDay + 1) // Monday

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

  return {
    from: startOfWeek.toISOString().split('T')[0],
    to: endOfWeek.toISOString().split('T')[0]
  }
}

const getTodayRange = () => {
  const today = new Date()
  const dateString = today.toISOString().split('T')[0]
  return {
    from: dateString,
    to: dateString
  }
}

const dateRange = ref(getTodayRange())

// Date constraints
const today = new Date()
const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString()
const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString()

// Group assignments and messages by date
const groupedAssignments = computed(() => {
  const groups: Record<string, { assignments: any[], messages: any[] }> = {}

  // Group assignments by date
  assignmentsStore.assignments.forEach(assignment => {
    const date = assignment.date
    if (!groups[date]) {
      groups[date] = { assignments: [], messages: [] }
    }
    groups[date].assignments.push(assignment)
  })

  // Group messages by date
  assignmentsStore.routeMessages.forEach(message => {
    const messageDate = message.created_at.split('T')[0] // Extract date part
    if (groups[messageDate]) {
      groups[messageDate].messages.push(message)
    }
  })

  // Sort by date
  const sortedGroups: Record<string, { assignments: any[], messages: any[] }> = {}
  Object.keys(groups)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(date => {
        sortedGroups[date] = groups[date]
        // Sort assignments within each day by scheduled_time
        sortedGroups[date].assignments.sort((a, b) => {
          if (!a.scheduled_time && !b.scheduled_time) return 0
          if (!a.scheduled_time) return 1
          if (!b.scheduled_time) return -1
          return a.scheduled_time.localeCompare(b.scheduled_time)
        })
      })

  return sortedGroups
})

const sortedAssignments = computed(() => {
  return [...assignmentsStore.assignments].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0
    if (!a.scheduled_time) return 1
    if (!b.scheduled_time) return -1
    return a.scheduled_time.localeCompare(b.scheduled_time)
  })
})

const getStatusColor = (status: string) => {
  if (!status) return 'medium'

  switch (status.toLowerCase()) {
    case 'pending':
      return 'warning'
    case 'in_progress':
      return 'primary'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'unclear':
      return 'medium'
    default:
      return 'medium'
  }
}

const getMessageTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'urgent':
      return 'danger'
    case 'warning':
      return 'warning'
    case 'info':
      return 'primary'
    default:
      return 'medium'
  }
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const formatDayHeader = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  // Check if it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  }

  // Check if it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  // Return day of week
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatWeekRange = () => {
  const fromDate = new Date(dateRange.value.from)
  const toDate = new Date(dateRange.value.to)

  const fromFormatted = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const toFormatted = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return `${fromFormatted} - ${toFormatted}`
}

const formatDateRange = () => {
  const fromDate = new Date(dateRange.value.from)
  const toDate = new Date(dateRange.value.to)

  if (dateRange.value.from === dateRange.value.to) {
    return fromDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const fromFormatted = fromDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  const toFormatted = toDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

  return `${fromFormatted} - ${toFormatted}`
}

const formatTime = (timeString: string) => {
  if (!timeString) return ''

  try {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    return timeString
  }
}

const viewAssignment = (id: number) => {
  router.push(`/tabs/assignments/${id}`)
}

const openDatePicker = () => {
  showDatePicker.value = true
}

const selectDateRange = (type: string) => {
  dateRangeType.value = type

  if (type === 'today') {
    dateRange.value = getTodayRange()
    showDatePicker.value = false
    refreshAssignments()
  } else if (type === 'week') {
    dateRange.value = getCurrentWeek()
    showDatePicker.value = false
    refreshAssignments()
  }
  // For custom, keep picker open
}

const onFromDateChange = (event: any) => {
  const selectedDate = event.detail.value.split('T')[0]
  dateRange.value.from = selectedDate

  // Ensure 'to' date is not before 'from' date
  if (new Date(dateRange.value.to) < new Date(selectedDate)) {
    dateRange.value.to = selectedDate
  }

  refreshAssignments()
}

const onToDateChange = (event: any) => {
  const selectedDate = event.detail.value.split('T')[0]
  dateRange.value.to = selectedDate

  // Ensure 'from' date is not after 'to' date
  if (new Date(dateRange.value.from) > new Date(selectedDate)) {
    dateRange.value.from = selectedDate
  }

  refreshAssignments()
}

const refreshAssignments = async () => {
  await Promise.all([
    assignmentsStore.fetchAssignments(dateRange.value.from, dateRange.value.to),
    assignmentsStore.fetchRouteMessages(dateRange.value.from, dateRange.value.to)
  ])

  if (assignmentsStore.error) {
    toastMessage.value = assignmentsStore.error
    showToast.value = true
  }
}

const handleRefresh = async (event: any) => {
  await refreshAssignments()
  event.target.complete()
}

const downloadRoutePlan = async () => {
  isDownloading.value = true
  const result = await assignmentsStore.downloadRoutePlan(dateRange.value.from, dateRange.value.to)

  if (result.success) {
    toastMessage.value = 'Route plan downloaded for offline use'
    showToast.value = true
  } else {
    toastMessage.value = result.message || 'Failed to download route plan'
    showToast.value = true
  }

  isDownloading.value = false
}

const showRoute = (assignment: any) => {
  selectedAssignment.value = assignment
  showRouteModal.value = true
}

const setGreeting = () => {
  const hour = new Date().getHours()
  const name = 'Thomas' // TODO: Get from user profile
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

  let greetingText = 'Good morning'
  if (hour >= 12 && hour < 18) {
    greetingText = 'Good afternoon'
  } else if (hour >= 18) {
    greetingText = 'Good evening'
  }

  greeting.value = `${greetingText} ${name}, ${today}`
}

const updateDateRangeFormatted = () => {
  dateRangeFormatted.value = formatDateRange()
}

onMounted(() => {
  refreshAssignments()
  setGreeting()
  updateDateRangeFormatted()
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
  margin: 0;
}

.tour-header {
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
  padding: 1.5rem 1rem;
  color: var(--ion-color-dark);
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  margin-bottom: 0.75rem;
}

.date-selector:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.date-range {
  flex: 1;
  color: var(--ion-color-dark);
}

.date-selector ion-icon {
  color: var(--ion-color-dark);
  font-size: 1.2rem;
}

.greeting {
  padding: 0 1rem 1rem;
  font-size: 0.95rem;
  color: var(--ion-color-medium);
}

.greeting p {
  margin: 0;
}

.custom-date-range {
  padding: 0.5rem 1rem 1.5rem;
  margin-top: 0.5rem;
}

.custom-range-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  border-bottom: 1px solid var(--ion-color-light-shade);
  margin-bottom: 1rem;
}

.custom-range-header ion-icon {
  font-size: 1.2rem;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.date-input-card {
  flex: 1;
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.date-input-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.date-input-card ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.date-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  margin-bottom: 0.25rem;
}

.date-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ion-color-medium);
  font-size: 1.2rem;
  padding-top: 1.5rem;
}

.assignments-list {
  padding: 0;
}

.assignment-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.assignment-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  width: 100%;
}

.assignment-time {
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 50px;
  color: var(--ion-color-dark);
}

.company-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.company-logo ion-icon {
  font-size: 24px;
  color: var(--ion-color-medium);
}

.company-details {
  flex: 1;
  min-width: 0;
}

.company-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.company-details .address {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-count {
  font-size: 1rem;
  font-weight: 600;
  min-width: 30px;
  text-align: center;
  color: var(--ion-color-dark);
}

.distance {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
  min-width: 40px;
  text-align: center;
}

.arrow-icon {
  font-size: 20px;
  color: var(--ion-color-medium);
  cursor: pointer;
}

.week-display {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.week-display ion-chip {
  font-weight: 500;
}

/* Day Group Styling */
.day-group {
  margin-bottom: 2rem;
}

.day-header {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.day-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.day-info h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.day-date {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Day Messages Styling */
.day-messages {
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.messages-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.messages-list {
  padding: 0.5rem 1rem 1rem;
}

.message-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.message-item:last-child {
  border-bottom: none;
}

.message-content {
  flex: 1;
}

.message-content p {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
}

.message-time {
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

/* Assignment Styling */
.day-assignments {
  margin: 0;
}

.assignment-content {
  flex: 1;
  padding: 0.5rem 0;
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.assignment-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
}

.header-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.assignment-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.address {
  font-weight: 500;
  color: var(--ion-color-dark) !important;
}

.order-number {
  font-family: monospace;
  font-size: 0.8rem !important;
}

.assignment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.items-count {
  font-weight: 500;
  color: var(--ion-color-primary) !important;
}

.assignment-time {
  font-weight: 500;
  color: var(--ion-color-secondary) !important;
}
</style>
