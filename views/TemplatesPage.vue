<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Service Templates</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshTemplates">
            <ion-icon :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="templatesStore.isLoading && templatesStore.templates.length === 0" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading templates...</p>
      </div>

      <div v-else-if="templatesStore.templates.length === 0" class="empty-state">
        <ion-icon :icon="documentTextOutline" size="large" color="medium"></ion-icon>
        <h2>No Templates</h2>
        <p>No service templates available.</p>
      </div>

      <ion-list v-else>
        <ion-item
          v-for="template in templatesStore.templates"
          :key="template.id"
          button
          @click="viewTemplate(template)"
        >
          <div class="template-content">
            <div class="template-header">
              <h3>{{ template.name }}</h3>
              <ion-badge color="secondary">v{{ template.version }}</ion-badge>
            </div>
            <div class="template-details">
              <p v-if="template.description" class="description">{{ template.description }}</p>
              <p class="form-title" v-if="template.form_title">Form: {{ template.form_title }}</p>
              <div class="template-stats">
                <span class="stat">{{ template.form_sections?.length || 0 }} sections</span>
                <span class="stat">{{ template.images?.length || 0 }} images</span>
              </div>
            </div>
          </div>
          <ion-icon :icon="chevronForwardOutline" slot="end" color="medium"></ion-icon>
        </ion-item>
      </ion-list>

      <!-- Template Detail Modal -->
      <ion-modal :is-open="showTemplateModal" @didDismiss="showTemplateModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedTemplate?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showTemplateModal = false">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content v-if="selectedTemplate">
          <div class="template-detail">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ selectedTemplate.name }}</ion-card-title>
                <ion-card-subtitle>Version {{ selectedTemplate.version }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <p v-if="selectedTemplate.description">{{ selectedTemplate.description }}</p>
                <p v-if="selectedTemplate.form_title"><strong>Form Title:</strong> {{ selectedTemplate.form_title }}</p>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="selectedTemplate.images && selectedTemplate.images.length > 0">
              <ion-card-header>
                <ion-card-title>Images ({{ selectedTemplate.images.length }})</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="images-grid">
                  <div
                    v-for="image in selectedTemplate.images"
                    :key="image.id"
                    class="image-item"
                  >
                    <img :src="image.url" :alt="image.filename" />
                    <p>{{ image.filename }}</p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="selectedTemplate.form_sections && selectedTemplate.form_sections.length > 0">
              <ion-card-header>
                <ion-card-title>Form Sections ({{ selectedTemplate.form_sections.length }})</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div v-for="section in selectedTemplate.form_sections" :key="section.id" class="form-section">
                  <h4>{{ section.title }}</h4>
                  <p v-if="section.description">{{ section.description }}</p>
                  <div v-if="section.fields && section.fields.length > 0" class="fields-list">
                    <div v-for="field in section.fields" :key="field.id" class="field-item">
                      <strong>{{ field.label }}</strong>
                      <span class="field-type">({{ field.type }})</span>
                      <p v-if="field.description">{{ field.description }}</p>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </div>
        </ion-content>
      </ion-modal>

      <ion-toast
        :is-open="showToast"
        :message="toastMessage"
        :duration="3000"
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
  IonModal,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonToast,
} from '@ionic/vue'
import { 
  documentTextOutline, 
  refreshOutline, 
  chevronForwardOutline,
  closeOutline
} from 'ionicons/icons'
import { ref, onMounted } from 'vue'
import { useTemplatesStore } from '@/stores/templates'

const templatesStore = useTemplatesStore()

const showTemplateModal = ref(false)
const selectedTemplate = ref<any>(null)
const showToast = ref(false)
const toastMessage = ref('')

const viewTemplate = (template: any) => {
  selectedTemplate.value = template
  showTemplateModal.value = true
}

const refreshTemplates = async () => {
  await templatesStore.fetchTemplates()
  if (templatesStore.error) {
    toastMessage.value = templatesStore.error
    showToast.value = true
  }
}

const handleRefresh = async (event: any) => {
  await refreshTemplates()
  event.target.complete()
}

onMounted(() => {
  refreshTemplates()
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

.template-content {
  flex: 1;
  padding: 0.5rem 0;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.template-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.template-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.description {
  color: var(--ion-color-dark) !important;
}

.form-title {
  font-weight: 500;
}

.template-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.stat {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  background: var(--ion-color-light);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.template-detail {
  padding: 1rem;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.image-item {
  text-align: center;
}

.image-item img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--ion-color-light);
}

.image-item p {
  margin: 0.5rem 0 0 0;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.form-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--ion-color-light);
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--ion-color-primary);
}

.fields-list {
  margin-top: 1rem;
}

.field-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--ion-color-light);
  border-radius: 4px;
}

.field-item:last-child {
  margin-bottom: 0;
}

.field-type {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  margin-left: 0.5rem;
}

.field-item p {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}
</style>
