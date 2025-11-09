<template>
  <ion-modal
      :is-open="isOpen"
      @did-dismiss="handleModalDismiss"
      :initial-breakpoint="existingOrder ? 1 : 0.6"
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
      <div v-show="isLoading" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>{{ existingOrder ? 'Loading machine order...' : 'Checking existing orders...' }}</p>
      </div>

      <!-- Existing Order -->
      <div v-if="existingOrder">
        <!-- Machine Order Details -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ machine?.internal_number }}</ion-card-title>
            <ion-card-subtitle>{{ machine?.object }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="detail-row">
              <ion-label>Status:</ion-label>
              <ion-chip :color="getStatusColor(existingOrder?.status || 0)">
                {{ getStatusLabel(existingOrder?.status || 0) }}
              </ion-chip>
            </div>
            <div class="detail-row" v-show="existingOrder?.template">
              <ion-label>Template:</ion-label>
              <span>{{ existingOrder?.template?.name }}</span>
            </div>
            <div class="detail-row" v-show="existingOrder?.date">
              <ion-label>Date:</ion-label>
              <span>{{ formatDate(existingOrder?.date || '') }}</span>
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
                :order-id="props.orderAddressId"
                :machine-order-id="existingOrder?.id"
                result-type="notes"
            />
          </ion-card-content>
        </ion-card>

        <!-- Template Selection -->
        <ion-card>
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
                  :order-id="props.orderAddressId"
                  :machine-order-id="existingOrder?.id"
                  result-type="template"
              />
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Template Form -->
        <ion-card v-show="existingOrder?.template?.form_sections?.length">
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

      <!-- New Order -->
      <div v-else-if="!existingOrder">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Create Machine Order</ion-card-title>
            <ion-card-subtitle>{{ machine?.internal_number }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div v-show="suggestedTemplate" class="suggested-template">
              <ion-item>
                <ion-icon :icon="bulbOutline" slot="start" color="warning"></ion-icon>
                <ion-label>
                  <h3>Suggested Template</h3>
                  <p>{{ suggestedTemplate?.name }}</p>
                  <p><small>Based on previous orders for this machine</small></p>
                </ion-label>
              </ion-item>
            </div>

            <ion-item>
              <ion-select
                  v-model="selectedTemplateId"
                  placeholder="Choose template"
                  interface="popover"
              >
                <ion-select-option value="">No Template</ion-select-option>
                <ion-select-option v-for="template in availableTemplates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-select v-model="selectedStatus" placeholder="Select status" interface="popover">
                <ion-select-option value="0">To Do</ion-select-option>
                <ion-select-option value="1">No Issues</ion-select-option>
                <ion-select-option value="2">Remark</ion-select-option>
                <ion-select-option value="3">Severe Issue</ion-select-option>
                <ion-select-option value="4">Retired</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-button @click="createMachineOrder" expand="block">Create Machine Order</ion-button>
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useMachineOrdersStore } from '@/stores/machineOrders'
import { useTemplatesStore } from '@/stores/templates'
import DrawingPreview from '@/components/DrawingPreview.vue'

interface Props {
  isOpen: boolean
  machine: any
  orderAddressId: number
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'created', 'updated'])

const machineOrdersStore = useMachineOrdersStore()
const templatesStore = useTemplatesStore()

const isLoading = ref(false)
const existingOrder = ref(null)
const suggestedTemplate = ref(null)
const selectedTemplateId = ref('')
const selectedStatus = ref('0')
const issues = ref('')
const remarks = ref('')
const formResponses = ref({})
const isFinished = ref(false)

const availableTemplates = computed(() => {
  return templatesStore.templates?.filter(t => t.is_active !== false) || []
})

const getStatusColor = (status: number) => {
  switch (status) {
    case 1: return 'success'
    case 2: return 'warning'
    case 3: return 'danger'
    case 4: return 'dark'
    default: return 'medium'
  }
}

const getStatusLabel = (status: number) => {
  const labels: Record<number, string> = { 0:'To Do',1:'No Issues',2:'Remark',3:'Severe Issue',4:'Retired' }
  return labels[status] || 'Unknown'
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

const notesDrawingId = computed(() => {
  if (!props.orderAddressId || !props.machine?.id) return ''
  return `${props.orderAddressId}_${props.machine.id}`
})

const templateDrawingId = computed(() => {
  if (!props.orderAddressId || !props.machine?.id || !existingOrder.value?.template?.id) return ''
  return `${props.orderAddressId}_${props.machine.id}_template_${existingOrder.value.template.id}`
})

const selectedTemplateImageUrl = computed(() => {
  console.log('[v0] Computing selectedTemplateImageUrl')
  console.log('[v0] existingOrder.value?.template:', existingOrder.value?.template)

  if (existingOrder.value?.template?.image_src) {
    console.log('[v0] Found image_src in existingOrder.template:', existingOrder.value.template.image_src)
    return existingOrder.value.template.image_src
  }

  if (existingOrder.value?.template?.id) {
    const templateId = existingOrder.value.template.id
    const fullTemplate = availableTemplates.value.find(t => t.id === templateId)
    if (fullTemplate?.image_src) {
      console.log('[v0] Found image_src in templates store:', fullTemplate.image_src)
      return fullTemplate.image_src
    }
  }

  console.log('[v0] No image_src found, returning empty string')
  return ''
})

const createMachineOrder = async () => {
  if (!props.machine || !props.orderAddressId) return
  isLoading.value = true
  try {
    const result = await machineOrdersStore.createMachineOrder({
      machine_id: props.machine.id,
      order_address_id: props.orderAddressId,
      template_id: selectedTemplateId.value || null,
      status: parseInt(selectedStatus.value),
    })
    const toast = await toastController.create({
      message: result.success ? 'Machine order created' : result.message || 'Failed',
      duration: 2000,
      color: result.success ? 'success':'danger',
    })
    await toast.present()
    if (result.success) emit('created')
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

const updateStatus = async () => {
  if (!existingOrder.value) return
  try {
    const result = await machineOrdersStore.updateMachineOrderStatus(existingOrder.value.id, {
      status: parseInt(selectedStatus.value),
      issues: issues.value,
      remarks: remarks.value,
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
  if (!props.machine || !props.orderAddressId) return
  isLoading.value = true
  try {
    const existing = machineOrdersStore.machineOrders.find(
        o => o.machine?.id === props.machine.id && o.order_address_id === props.orderAddressId
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
          .filter(o => o.machine?.id === props.machine.id && o.template)
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

const handleModalDismiss = () => {
  const tabBar = document.querySelector('ion-tab-bar')
  if (tabBar) {
    tabBar.style.display = 'flex'
  }
  emit('close')
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    const tabBar = document.querySelector('ion-tab-bar')
    if (tabBar) {
      tabBar.style.display = 'none'
    }
    await checkExistingOrder()
  }
  else {
    const tabBar = document.querySelector('ion-tab-bar')
    if (tabBar) {
      tabBar.style.display = 'flex'
    }
    existingOrder.value = null
    suggestedTemplate.value = null
    selectedTemplateId.value = ''
    selectedStatus.value = '0'
    issues.value = ''
    remarks.value = ''
    formResponses.value = {}
    isFinished.value = false
  }
}, { immediate: true })

onMounted(async () => {
  await templatesStore.fetchTemplates()
})
</script>

<style scoped>
.loading-container { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; text-align:center; }
.detail-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem; }
.suggested-template { margin-bottom:1rem; border:1px solid var(--ion-color-warning); border-radius:8px; }
.form-section { margin-bottom:2rem; padding-bottom:1rem; border-bottom:1px solid var(--ion-color-light); }
.form-section h3 { margin:0 0 .5rem 0; color:var(--ion-color-primary); }
.form-field { margin-bottom:1rem; }
.required { color:var(--ion-color-danger); }
</style>
