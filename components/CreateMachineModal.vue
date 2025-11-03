<template>
  <ion-modal :is-open="isOpen" @did-dismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Machine</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form @submit.prevent="createMachine">
        <ion-item>
          <ion-label position="stacked">Internal Number *</ion-label>
          <ion-input
              v-model="formData.internal_number"
              type="text"
              required
              placeholder="Enter internal number"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Object</ion-label>
          <ion-input
              v-model="formData.object"
              type="text"
              placeholder="Enter object description"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Producer</ion-label>
          <ion-input
              v-model="formData.producer"
              type="text"
              placeholder="Enter producer"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Type</ion-label>
          <ion-input
              v-model="formData.type"
              type="text"
              placeholder="Enter type"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Serial Number</ion-label>
          <ion-input
              v-model="formData.serial_number"
              type="text"
              placeholder="Enter serial number"
          ></ion-input>
        </ion-item>

        <div class="form-actions">
          <ion-button
              type="submit"
              expand="block"
              :disabled="isLoading || !formData.internal_number"
          >
            <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
            <span v-else>Create Machine</span>
          </ion-button>
        </div>
      </form>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { ref, reactive } from 'vue'
import { useMachinesStore } from '@/stores/machines'

interface Props {
  isOpen: boolean
  addressId?: number
  customerId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  created: []
}>()

const machinesStore = useMachinesStore()
const isLoading = ref(false)

const formData = reactive({
  internal_number: '',
  object: '',
  producer: '',
  type: '',
  serial_number: '',
})

const createMachine = async () => {
  if (!props.addressId || !props.customerId) {
    const toast = await toastController.create({
      message: 'Missing address or customer information',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
    return
  }

  isLoading.value = true

  try {
    const machineData = {
      ...formData,
      address_id: props.addressId,
      customer_id: props.customerId,
    }

    const result = await machinesStore.createMachine(machineData)

    if (result.success) {
      // Reset form
      Object.keys(formData).forEach(key => {
        formData[key as keyof typeof formData] = ''
      })

      const toast = await toastController.create({
        message: 'Machine created successfully',
        duration: 2000,
        color: 'success',
      })
      await toast.present()

      emit('created')
    } else {
      const toast = await toastController.create({
        message: result.message || 'Failed to create machine',
        duration: 3000,
        color: 'danger',
      })
      await toast.present()
    }
  } catch (error) {
    console.error('Error creating machine:', error)
    const toast = await toastController.create({
      message: 'An error occurred while creating the machine',
      duration: 3000,
      color: 'danger',
    })
    await toast.present()
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.form-actions {
  padding: 1rem;
}
</style>
