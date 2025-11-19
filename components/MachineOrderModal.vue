<template>
  <ion-modal
      :is-open="isOpen"
      @did-dismiss="handleModalDismiss"
      :initial-breakpoint="1"
      :breakpoints="[0, 0.6, 0.9, 1]"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ existingOrder ? 'Machine Order Details' : 'Create Machine Order' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Loading -->
      <div v-if="isLoading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>{{ existingOrder ? 'Loading machine order...' : 'Creating machine order...' }}</p>
      </div>

      <!-- Existing Order -->
      <div v-else-if="existingOrder && currentMachine">
        <!-- Machine Order Details -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ currentMachine?.internal_number }}</ion-card-title>
            <ion-card-subtitle>{{ currentMachine?.object }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="detail-row">
              <ion-label>Status:</ion-label>
              <ion-chip :color="getMachineStatusColor(currentMachine.status)">
                {{ getMachineStatusLabel(currentMachine.status) }}
              </ion-chip>
            </div>
            <div class="detail-row" v-if="existingOrder?.template">
              <ion-label>Template:</ion-label>
              <span>{{ existingOrder?.template?.name }}</span>
            </div>
            <div class="detail-row" v-if="existingOrder?.date">
              <ion-label>Date:</ion-label>
              <span>{{ existingOrder?.date || '' }}</span>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Notes Section -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Notes</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <DrawingPreview
                :drawing-id="notesDrawingId"
                :order-id="props.orderId"
                :machine-order-id="existingOrder?.id"
                result-type="notes"
            />
          </ion-card-content>
        </ion-card>

        <!-- Last Inspection Issues Section -->
        <ion-card v-if="showLastInspectionIssues">
          <ion-card-header>
            <ion-card-title>Last Inspection Issues - {{ currentMachine?.lastOrder?.created_at }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-if="!currentMachine?.lastOrder?.issues || lastInspectionIssues.length === 0" class="no-issues">
              No issues from last inspection
            </div>
            <div v-else class="issues-list">
              <div
                  v-for="(issue, index) in lastInspectionIssues"
                  :key="index"
                  :class="['issue-item', getIssueClass(issue)]"
              >
                <div class="issue-text">{{ issue.text }}</div>
                <ion-button
                    size="small"
                    :color="issue.resolved ? 'success' : 'medium'"
                    @click="toggleIssueResolved(index)"
                >
                  {{ issue.resolved ? 'Resolved' : 'Mark Resolved' }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Template Selection -->
        <ion-card v-if="!showLastInspectionIssues">
          <ion-card-header>
            <ion-card-title>Template</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-select
                  v-model="selectedTemplateId"
                  placeholder="Choose template"
                  interface="popover"
                  label="Select Template"
              >
                <ion-select-option value="">No Template</ion-select-option>
                <ion-select-option
                    v-for="template in availableTemplates"
                    :key="template.id"
                    :value="template.id"
                >
                  {{ template.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button
                @click="assignTemplate"
                expand="block"
                :disabled="selectedTemplateId === (existingOrder?.template?.id || '')"
            >
              {{ selectedTemplateId ? 'Assign Template' : 'Remove Template' }}
            </ion-button>

            <div v-show="existingOrder?.template" style="margin-top: 1.5rem;">
              <DrawingPreview
                  :drawing-id="templateDrawingId"
                  :initial-image-url="selectedTemplateImageUrl"
                  :key="templateDrawingId"
                  :order-id="props.orderId"
                  :machine-order-id="existingOrder?.id"
                  result-type="template"
              />
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Template Form -->
        <ion-card v-show="existingOrder?.template?.form_sections?.length && 0==1 && !showLastInspectionIssues">
          <ion-card-header>
            <ion-card-title>{{ existingOrder?.template?.form_title || 'Template Form' }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-for="section in existingOrder?.template?.form_sections || []" :key="section.id" class="form-section">
              <h3>{{ section.title }}</h3>
              <p v-show="section.description">{{ section.description }}</p>

              <div v-for="field in section.fields" :key="field.id" class="form-field">
                <ion-item>
                  <ion-label position="stacked">
                    {{ field.label }}
                    <span v-show="field.required" class="required">*</span>
                  </ion-label>

                  <ion-input v-show="field.type === 'text'" v-model="formResponses[field.id]" :placeholder="field.label" />
                  <ion-textarea v-show="field.type === 'textarea'" v-model="formResponses[field.id]" :placeholder="field.label" :rows="3" />
                  <ion-select
                      v-show="field.type === 'select'"
                      v-model="formResponses[field.id]"
                      interface="popover"
                  >
                    <ion-select-option v-for="option in field.options" :key="option" :value="option">
                      {{ option }}
                    </ion-select-option>
                  </ion-select>
                  <ion-checkbox v-show="field.type === 'checkbox'" v-model="formResponses[field.id]" />
                  <ion-input v-show="field.type === 'number'" v-model="formResponses[field.id]" type="number" :placeholder="field.label" />
                </ion-item>
              </div>
            </div>

            <ion-button @click="saveFormResponses" expand="block" color="success">
              Save Form Responses
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Status Update -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Status Update</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Finished</ion-label>
              <ion-toggle v-model="isFinished" @ionChange="updateFinished"></ion-toggle>
            </ion-item>
          </ion-card-content>
        </ion-card>
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonInput,
  IonCheckbox,
  IonSpinner,
  IonChip,
  IonToggle,
  toastController,
} from '@ionic/vue'
import { closeOutline, bulbOutline } from 'ionicons/icons'
import { ref, computed, watch, onMounted } from 'vue'
import { useMachineOrdersStore } from '@/stores/machineOrders'
import { useMachinesStore } from '@/stores/machines'
import { useTemplatesStore } from '@/stores/templates'
import DrawingPreview from '@/components/DrawingPreview.vue'

interface Props {
  isOpen: boolean
  machine: any
  orderAddressId: number,
  orderId:number,
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'created', 'updated'])

const machineOrdersStore = useMachineOrdersStore()
const machinesStore = useMachinesStore()
const templatesStore = useTemplatesStore()

const currentMachine = ref<any>(null)
const isLoading = ref(false)
const existingOrder = ref(null)
const suggestedTemplate = ref(null)
const selectedTemplateId = ref('')
const selectedStatus = ref('0')
const issues = ref('')
const remarks = ref('')
const formResponses = ref({})
const isFinished = ref(false)
const lastInspectionIssues = ref<any[]>([])
const loadedTemplateImageUrl = ref('')

const showLastInspectionIssues = computed(() => {
  return currentMachine.value?.lastOrder && currentMachine.value.lastOrder.order_id !== props.orderId
})

const availableTemplates = computed(() => {
  return templatesStore.templates?.filter(t => t.is_active !== false) || []
})

const notesDrawingId = computed(() => {
  if (!props.orderAddressId || !currentMachine.value?.id) return ''
  return `${props.orderAddressId}_${currentMachine.value.id}`
})

const templateDrawingId = computed(() => {
  if (!props.orderAddressId || !currentMachine.value?.id || !existingOrder.value?.template?.id) return ''
  return `${props.orderAddressId}_${currentMachine.value.id}_template_${existingOrder.value.template.id}`
})

const selectedTemplateImageUrl = computed(() => {
  // Return the loaded URL if available
  if (loadedTemplateImageUrl.value) {
    return loadedTemplateImageUrl.value
  }

  if (existingOrder.value?.template?.image_src) {
    return existingOrder.value.template.image_src
  }

  if (existingOrder.value?.template?.id) {
    const templateId = existingOrder.value.template.id
    const fullTemplate = availableTemplates.value.find(t => t.id === templateId)
    if (fullTemplate?.image_src) {
      return fullTemplate.image_src
    }
  }

  return ''
})

const createMachineOrder = async () => {
  if (!props.orderAddressId) return
  isLoading.value = true
  try {
    const machineOrderData: any = {
      order_address_id: props.orderAddressId,
      template_id: selectedTemplateId.value || null,
      status: parseInt(selectedStatus.value),
    }

    if (currentMachine.value) {
      machineOrderData.machine_id = currentMachine.value.id
    }

    const result = await machineOrdersStore.createMachineOrder(machineOrderData)
    const toast = await toastController.create({
      message: result.success ? 'Machine order created' : result.message || 'Failed',
      duration: 2000,
      color: result.success ? 'success':'danger',
    })
    await toast.present()
    if (result.success) {
      if (result.data?.machine) {
        machinesStore.addMachine(result.data.machine)
        currentMachine.value = result.data.machine
      }
      if (result.data?.machine_order) {
        existingOrder.value = result.data.machine_order
        selectedStatus.value = result.data.machine_order?.status?.toString() || '0'
        isFinished.value = result.data.machine_order?.finished || false
      }
    }
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

const assignTemplate = async () => {
  if (!existingOrder.value) return
  try {
    const result = await machineOrdersStore.assignTemplate(existingOrder.value.id, selectedTemplateId.value || null)
    if (result.success) {
      existingOrder.value = await machineOrdersStore.fetchMachineOrderById(existingOrder.value.id)
      const toast = await toastController.create({ message: 'Template assigned', duration: 2000, color: 'success' })
      await toast.present()
      emit('updated')
    }
  } catch (e) { console.error(e) }
}

const saveFormResponses = async () => {
  const toast = await toastController.create({ message: 'Form responses saved', duration: 2000, color: 'success' })
  await toast.present()
}

const updateFinished = async () => {
  if (!existingOrder.value) return
  try {
    const result = await machineOrdersStore.updateMachineOrderStatus(existingOrder.value.id, {
      finished: isFinished.value ? 1 : 0,
    })
    const toast = await toastController.create({
      message: result.success ? 'Machine order updated' : result.message || 'Failed',
      duration: 2000,
      color: result.success ? 'success':'danger',
    })
    await toast.present()
    if (result.success) {
      existingOrder.value = { ...existingOrder.value, ...result.data.machine_order }
      emit('updated')
    }
  } catch (e) { console.error(e) }
}

const checkExistingOrder = async () => {
  if (!currentMachine.value || !props.orderAddressId) return
  isLoading.value = true
  try {
    const existing = machineOrdersStore.machineOrders.find(
        o => o.machine?.id === currentMachine.value.id && o.order_address_id === props.orderAddressId
    )
    if (existing) {
      existingOrder.value = existing
      selectedStatus.value = existing.status.toString()
      issues.value = existing.issues || ''
      remarks.value = existing.remarks || ''
      selectedTemplateId.value = existing.template?.id || ''
      isFinished.value = existing.finished || false
      if (existing.form_responses) {
        const responses: Record<string, any> = {}
        existing.form_responses.forEach(r => { responses[r.field_id] = r.response_data })
        formResponses.value = responses
      }
    } else {
      const lastTemplateOrder = machineOrdersStore.machineOrders
          .filter(o => o.machine?.id === currentMachine.value.id && o.template)
          .pop()
      if (lastTemplateOrder) {
        const latestTemplate = availableTemplates.value.find(t =>
            t.id === lastTemplateOrder.template.id || t.parent_template_id === lastTemplateOrder.template.parent_template_id
        )
        if (latestTemplate) {
          suggestedTemplate.value = latestTemplate
          selectedTemplateId.value = latestTemplate.id
        }
      }
    }
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

const handleModalDismiss = async () => {
  const tabBar = document.querySelector('ion-tab-bar')
  if (tabBar) {
    tabBar.style.display = 'flex'
  }
  emit('close')
}

watch(() => existingOrder.value?.template?.id, async (templateId) => {
  if (templateId) {
    const template = availableTemplates.value.find(t => t.id === templateId)
    if (template) {
      loadedTemplateImageUrl.value = await templatesStore.getTemplateImageUrl(template)
    }
  } else {
    loadedTemplateImageUrl.value = ''
  }
}, { immediate: true })

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    currentMachine.value = props.machine

    const tabBar = document.querySelector('ion-tab-bar')
    if (tabBar) {
      tabBar.style.display = 'none'
    }

    const existing = machineOrdersStore.machineOrders.find(
        o => o.machine?.id === currentMachine.value?.id && o.order_address_id === props.orderAddressId
    )

    if (!existing && !currentMachine.value) {
      await createMachineOrder()
    } else if (existing || currentMachine.value) {
      await checkExistingOrder()
    }

    if (showLastInspectionIssues.value && currentMachine.value?.lastOrder?.issues) {
      try {
        if (typeof currentMachine.value.lastOrder.issues === 'string') {
          lastInspectionIssues.value = JSON.parse(currentMachine.value.lastOrder.issues)
        } else {
          lastInspectionIssues.value = currentMachine.value.lastOrder.issues
        }
      } catch (e) {
        console.error('[v0] Failed to parse issues:', e)
        lastInspectionIssues.value = []
      }
    } else {
      lastInspectionIssues.value = []
    }

    if (existingOrder.value?.template?.id) {
      const template = availableTemplates.value.find(t => t.id === existingOrder.value.template.id)
      if (template) {
        loadedTemplateImageUrl.value = await templatesStore.getTemplateImageUrl(template)
      }
    }
  }
  else {
    if (showLastInspectionIssues.value && lastInspectionIssues.value.length > 0) {
      await saveLastInspectionIssues()
    }

    const tabBar = document.querySelector('ion-tab-bar')
    if (tabBar) {
      tabBar.style.display = 'flex'
    }

    currentMachine.value = null
    existingOrder.value = null
    suggestedTemplate.value = null
    selectedTemplateId.value = ''
    selectedStatus.value = '0'
    issues.value = ''
    remarks.value = ''
    formResponses.value = {}
    isFinished.value = false
    lastInspectionIssues.value = []
    isLoading.value = false
    loadedTemplateImageUrl.value = ''
  }
}, { immediate: true })

onMounted(async () => {
  // await templatesStore.fetchTemplates()
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
      return 'New'
  }
}

const getIssueClass = (issue: any) => {
  if (issue.resolved) return 'issue-resolved'
  if (issue.status === 'severe_issue') return 'issue-severe'
  if (issue.status === 'issue') return 'issue-warning'
  return ''
}

const toggleIssueResolved = (index: number) => {
  lastInspectionIssues.value[index].resolved = !lastInspectionIssues.value[index].resolved
}

const saveLastInspectionIssues = async () => {
  if (!showLastInspectionIssues.value || !currentMachine.value?.lastOrder?.id) return

  try {
    const issuesJson = JSON.stringify(lastInspectionIssues.value)

    await machineOrdersStore.updateMachineOrderStatus(currentMachine.value.lastOrder.id, {
      issues: issuesJson
    })

    if (currentMachine.value?.lastOrder) {
      currentMachine.value.lastOrder.issues = lastInspectionIssues.value
    }
  } catch (e) {
    console.error('[v0] Failed to save last inspection issues:', e)
  }
}
</script>

<style scoped>
.loading-container { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; text-align:center; }
.detail-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem; }
.suggested-template { margin-bottom:1rem; border:1px solid var(--ion-color-warning); border-radius:8px; }
.form-section { margin-bottom:2rem; padding-bottom:1rem; border-bottom:1px solid var(--ion-color-light); }
.form-section h3 { margin:0 0 .5rem 0; color:var(--ion-color-primary); }
.form-field { margin-bottom:1rem; }
.required { color:var(--ion-color-danger); }

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.issue-item {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.issue-text {
  flex: 1;
}

.issue-severe {
  background-color: rgba(255, 59, 48, 0.1);
}

.issue-warning {
  background-color: rgba(255, 204, 0, 0.1);
}

.issue-resolved {
  background-color: rgba(52, 199, 89, 0.1);
}

.no-issues {
  padding: 1rem;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
