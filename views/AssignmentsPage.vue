<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <!-- Redesigned header with date range and greeting -->
        <div class="tour-header">
          <div>
            <h1 class="date-range">{{ dateRangeFormatted }}
              <ion-icon class="calendar-icon" @click="openDatePicker" :icon="calendar" />
            </h1>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
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
            </ion-item>
            <ion-item button @click="selectDateRange('week')">
              <ion-label>This Week</ion-label>
            </ion-item>
            <ion-item button @click="selectDateRange('custom')">
              <ion-label>Custom Range</ion-label>
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

      <!-- Message of the day -->
      <div v-if="todayMessages.length" class="day-message-box">
        <div class="message-border"></div>
        <div class="message-content">
          <p>{{ greeting }}</p>
          <div v-for="(message, index) in todayMessages" :key="index">
            <p>{{ message.message }}</p>
          </div>
        </div>
      </div>

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
        <div v-for="(group, date) in groupedByDate" :key="date" class="date-group">
          <!-- Date divider -->
          <div class="date-divider">
            {{ formatDateDivider(date) }}
          </div>
          <ion-list style="padding-bottom: 0; padding-top: 0 !important;">
            <ion-item
                v-for="assignment in group"
                :key="assignment.id"
                class="assignment-item"
                :class="{ 'finished-assignment': isFinished(assignment) }"
                lines="full"
            >
              <div class="assignment-row">
                <!-- Time -->
                <div class="assignment-time">
                  {{ assignment.estimated_time_hm || '--:--' }}
                </div>

                <!-- Company Logo Placeholder -->
                <div class="company-logo">
                  <ion-icon :icon="business" />
                </div>

                <!-- Company Details -->
                <div class="company-details">
                  <h3>{{ assignment.order?.customer?.name || 'No Customer' }}</h3>
                  <a href="javascript:void(0)" v-if="assignment.address" class="address" @click.stop="showRoute(assignment)">
                    {{ assignment.address.street }}, {{ assignment.address.postal_code }} {{ assignment.address.city }}
                  </a>
                </div>

                <!-- Item Count -->
                <div class="item-count">
                  {{ assignment.number_of_items || 0 }}
                </div>

                <div class="tracking-time-group">
                  <ion-icon
                      :icon="getTrackingIcon(assignment)"
                      :class="['tracking-icon', getTrackingClass(assignment)]"
                  />
                  <span :class="['tracking-time', getTrackingClass(assignment)]">
                    {{ getTrackingTime(assignment) }}
                  </span>
                </div>
                <!-- Arrow -->
                <ion-icon :icon="chevronForwardOutline" class="arrow-icon" @click="viewAssignment(assignment.id)" />
              </div>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <!-- Added unfinished appointments bar above tracking bar -->
      <div v-if="assignments.length > 0 && unfinishedCount > 0" class="unfinished-bar">
        <span class="unfinished-text">{{ unfinishedCount }} Unfinished Appointment{{ unfinishedCount !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Re-added tracking summary bar at bottom of content -->
      <div class="tracking-summary-bar">
        <div class="summary-left">
          <ion-icon :icon="timeOutline" class="summary-icon" />
          <span v-if="totalTodayMinutes === 0">No Time Tracked</span>
          <span v-else>Total time today: {{ formatTotalTime() }}</span>
        </div>
        <div class="summary-right">
          <!-- Updated buttons to match tracking type colors -->
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
            {{ trackingStore.currentTracking.type }}: {{ formatCurrentTrackingTime() }}
          </ion-button>
        </div>
      </div>
    </ion-content>

    <!-- Route detail modal -->
    <RouteDetailModal
        :is-open="showRouteModal"
        :assignment="selectedAssignment"
        @close="showRouteModal = false"
    />

    <!-- Added TimeTrackingModal -->
    <TimeTrackingModal
        :is-open="showTimeTrackingModal"
        @close="showTimeTrackingModal = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
/* eslint-disable */
// @ts-nocheck
// biome-ignore lint: Lint disabled per user request
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
  calendar,
  downloadOutline,
  chevronDownOutline,
  checkmarkOutline,
  business,
  timeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAssignmentsStore } from '@/stores/assignments'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import RouteDetailModal from '@/components/RouteDetailModal.vue'
import TimeTrackingModal from '@/components/TimeTrackingModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useTrackingTimesStore } from '@/stores/trackingTimes'
import { useTemplatesStore } from '@/stores/templates'

const router = useRouter()
const authStore = useAuthStore()
const assignmentsStore = useAssignmentsStore()
const { saveOfflineFile } = useOfflineStorage()
const trackingStore = useTrackingTimesStore()
const templatesStore = useTemplatesStore()
const showToast = ref(false)
const toastMessage = ref('')
const dateRangeType = ref('today')
const isDownloading = ref(false)
const showDatePicker = ref(false)
const showRouteModal = ref(false)
const selectedAssignment = ref<any>(null)
const greeting = ref('')
const dateRangeFormatted = ref('')
const currentTime = ref(Date.now())
const showTimeTrackingModal = ref(false)

const getCurrentWeek = () => {
  const today = new Date()
  const currentDay = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDay + 1)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

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

const today = new Date()
const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString()
const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString()

const groupedAssignments = computed(() => {
  const groups: Record<string, { assignments: any[], messages: any[] }> = {}

  assignmentsStore.assignments.forEach(assignment => {
    const date = assignment.date
    if (!groups[date]) {
      groups[date] = { assignments: [], messages: [] }
    }
    groups[date].assignments.push(assignment)
  })

  assignmentsStore.routeMessages.forEach(message => {
    const messageDate = message.created_at.split('T')[0]
    if (groups[messageDate]) {
      groups[messageDate].messages.push(message)
    }
  })

  const sortedGroups: Record<string, { assignments: any[], messages: any[] }> = {}
  Object.keys(groups)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(date => {
        sortedGroups[date] = groups[date]
        sortedGroups[date].assignments.sort((a, b) => {
          if (!a.scheduled_time && !b.scheduled_time) return 0
          if (!a.scheduled_time) return 1
          if (!b.scheduled_time) return -1
          return a.scheduled_time.localeCompare(b.scheduled_time)
        })
      })

  return sortedGroups
})

const todayMessages = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return assignmentsStore.routeMessages.filter(message => {
    const messageDate = message.created_at.split('T')[0]
    return messageDate === today
  })
})

const assignments = computed(() => {
  return [...assignmentsStore.assignments].sort((a, b) => {
    if (!a.scheduled_time && !b.scheduled_time) return 0
    if (!a.scheduled_time) return 1
    if (!b.scheduled_time) return -1
    return a.scheduled_time.localeCompare(b.scheduled_time)
  })
})

const getStaticStatusColor = (status: string) => {
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

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

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
    return fromDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const fromFormatted = fromDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  const toFormatted = toDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

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
}

const onFromDateChange = (event: any) => {
  const selectedDate = event.detail.value.split('T')[0]
  dateRange.value.from = selectedDate

  if (new Date(dateRange.value.to) < new Date(selectedDate)) {
    dateRange.value.to = selectedDate
  }

  refreshAssignments()
}

const onToDateChange = (event: any) => {
  const selectedDate = event.detail.value.split('T')[0]
  dateRange.value.to = selectedDate

  if (new Date(dateRange.value.from) > new Date(selectedDate)) {
    dateRange.value.from = selectedDate
  }

  refreshAssignments()
}

const refreshAssignments = async () => {
  const today = new Date().toISOString().split('T')[0]
  await Promise.all([
    assignmentsStore.fetchAssignments(dateRange.value.from, dateRange.value.to),
    assignmentsStore.fetchRouteMessages(dateRange.value.from, dateRange.value.to),
    trackingStore.fetchTrackingTimes(today)
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
  const name = authStore.user?.name;
  const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

  let greetingText = 'Good morning'
  if (hour >= 12 && hour < 18) {
    greetingText = 'Good afternoon'
  } else if (hour >= 18) {
    greetingText = 'Good evening'
  }

  greeting.value = `${greetingText} ${name},`
}

const updateDateRangeFormatted = () => {
  dateRangeFormatted.value = formatDateRange()
}

const unfinishedCount = computed(() => {
  return assignments.value.filter(a => !isFinished(a)).length
})

const groupedByDate = computed(() => {
  const groups: Record<string, any[]> = {}

  assignments.value.forEach(assignment => {
    const date = assignment.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(assignment)
  })

  Object.keys(groups).forEach(date => {
    groups[date].sort((a, b) => {
      if (!a.scheduled_time) return 1
      if (!b.scheduled_time) return -1
      return a.scheduled_time.localeCompare(b.scheduled_time)
    })
  })

  return groups
})

const isFinished = (assignment: any) => {
  return assignment.order?.finished === 1 || assignment.order?.finished === true
}

const formatDateDivider = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

const getAssignmentTrackingTimes = (assignment: any) => {
  if (!assignment.id) return []
  return trackingStore.trackingTimes.filter(
      (tt) => tt.assignment_id === assignment.id
  )
}

const calculateTotalTime = (assignment: any) => {
  currentTime.value // This ensures Vue tracks this dependency

  const trackingTimes = getAssignmentTrackingTimes(assignment)
  let totalMinutes = 0

  trackingTimes.forEach(tt => {
    if (tt.duration_minutes) {
      totalMinutes += tt.duration_minutes
    } else if (tt.start_date && !tt.end_date) {
      const start = new Date(tt.start_date).getTime()
      const now = Date.now()
      totalMinutes += Math.floor((now - start) / 60000)
    }
  })

  return totalMinutes
}

const hasActiveTracking = (assignment: any) => {
  const trackingTimes = getAssignmentTrackingTimes(assignment)
  return trackingTimes.some(tt => !tt.end_date)
}

const getTrackingIcon = (assignment: any) => {
  const totalMinutes = calculateTotalTime(assignment)
  const isTracking = hasActiveTracking(assignment)

  if (totalMinutes > 0 && !isTracking) {
    return checkmarkCircleOutline
  }
  if (isTracking) {
    return timeOutline // Using hourglass-like icon
  }
  return timeOutline
}

const getTrackingColor = (assignment: any) => {
  if (isFinished(assignment)) {
    return 'success'
  }
  if (hasActiveTracking(assignment)) {
    return 'warning'
  }
  return 'medium'
}

const getTrackingClass = (assignment: any) => {
  const totalMinutes = calculateTotalTime(assignment)
  const isTracking = hasActiveTracking(assignment)

  if (totalMinutes > 0 && !isTracking) {
    return 'timer-success'
  }
  if (isTracking) {
    return 'timer-danger'
  }
  return 'timer-default'
}

const getTrackingTime = (assignment: any) => {
  const totalMinutes = calculateTotalTime(assignment)
  const isTracking = hasActiveTracking(assignment)

  if (totalMinutes === 0) return '00:00'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${minutes}min`
}

const refreshAssignmentsHook = async () => {
  await refreshAssignments()
}

const getTotalTimeToday = () => {
  currentTime.value // Track dependency for live updates

  let totalMs = 0
  const today = new Date().toISOString().split('T')[0]

  trackingStore.trackingTimes.forEach(tt => {
    if (tt.start_date && tt.start_date.startsWith(today)) {
      if (tt.duration_minutes) {
        totalMs += tt.duration_minutes * 60000
      } else if (tt.start_date && !tt.end_date) {
        const start = new Date(tt.start_date).getTime()
        const now = Date.now()
        totalMs += now - start
      }
    }
  })

  return totalMs
}

const totalTodayMinutes = computed(() => {
  const totalMs = getTotalTimeToday()
  return Math.floor(totalMs / 60000)
})

const formatTotalTime = () => {
  const totalMs = getTotalTimeToday()
  const hours = Math.floor(totalMs / 3600000)
  const mins = Math.floor((totalMs % 3600000) / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const formatCurrentTrackingTime = () => {
  if (!trackingStore.currentTracking) return ''

  currentTime.value // Track dependency

  const start = new Date(trackingStore.currentTracking.start_date).getTime()
  const now = Date.now()
  const totalMs = now - start

  const hours = Math.floor(totalMs / 3600000)
  const mins = Math.floor((totalMs % 3600000) / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const openTimeTrackingModal = () => {
  showTimeTrackingModal.value = true
}

let timeUpdateInterval: any = null

const initialize = () => {
  templatesStore.fetchTemplates()
  refreshAssignmentsHook()
  setGreeting()
  updateDateRangeFormatted()

  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
}

onMounted(initialize)

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

const getTrackingTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'driving':
      return '#9b59b6' // Purple for driving (matching TimeTrackingModal)
    case 'work':
      return '#3498db' // Blue for work (matching TimeTrackingModal)
    case 'pause':
      return '#e74c3c' // Red for pause (matching TimeTrackingModal)
    default:
      return '#4CAF50' // Green for start button
  }
}
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
  padding: 1.5rem 2rem;
  color: var(--ion-color-dark);
}

.tour-header .calendar-icon {
  position: relative;
  left: 10px;
  top: 5px;
  font-size: 1.225rem;
  color: #ffffff;
  background: var(--ion-color-dark-gray);
  padding: 0.3rem 1rem;
  border-radius: 1rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.company-logo ion-icon {
  font-size: 40px;
  color: var(--ion-color-medium);
}

.company-details {
  flex: 1;
  min-width: 0;
}

.company-details a {
  color: var(--ion-color-primary-shade) !important;
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
  font-size: 32px;
  color: var(--ion-color-dark);
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

.day-message-box {
  background: #fffdf2;
  font-size: 18px;
  padding: 1.5rem 2rem;
}

.day-message-box .message-content p {
  margin-bottom: 1rem;
  font-size: 18px !important;
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

.date-divider {
  background: var(--ion-color-dark-gray);
  color: white;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.9rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.timer-success {
  color: green;
}

.timer-danger {
  color: red;
}

.timer-default {
  color: black;
}

.tracking-time-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.tracking-icon {
  font-size: 20px;
}

.tracking-time {
  font-size: 0.75rem;
  font-weight: 600;
}

/* Updated tracking summary bar to be fixed at bottom, bonded with tabs */
.tracking-summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #d3d3d3;
  padding: 0.75rem 1rem;
  border-top: 1px solid #c0c0c0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.summary-icon {
  font-size: 20px;
}

.summary-right {
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
}

.tracking-button {
  --background: #ff8c00;
  --background-hover: #ff7700;
  --background-activated: #ff7700;
  --color: white;
  --border-radius: 8px;
  font-weight: 600;
  text-transform: capitalize;
}

/* Added light green background for finished assignments */
.finished-assignment {
  --background: #d4edda;
}

/* Added unfinished appointments bar above tracking bar */
.unfinished-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  padding: 0.75rem 1rem;
  border-top: 1px solid #e0e0e0;
  position: fixed;
  bottom: 87px;
  left: 0;
  right: 0;
  z-index: 101;
}

.unfinished-text {
  color: #007bff;
  font-size: 0.95rem;
  font-weight: 600;
}
</style>
