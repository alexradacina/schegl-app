<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My Drawings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="drawings-list">
        <ion-button expand="block" @click="openDrawing('drawing-1')">
          Open Drawing 1
        </ion-button>
        <ion-button expand="block" @click="openDrawing('drawing-2')">
          Open Drawing 2
        </ion-button>
        <ion-button expand="block" @click="openDrawing('drawing-3')">
          Open Drawing 3
        </ion-button>
      </div>

      <DrawingModal
          :is-open="isModalOpen"
          :drawing-id="currentDrawingId"
          @close="closeDrawing"
      />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue';
import DrawingModal from '../components/DrawingModal.vue';

const isModalOpen = ref(false);
const currentDrawingId = ref('');

const openDrawing = (id) => {
  currentDrawingId.value = id;
  isModalOpen.value = true;
};

const closeDrawing = () => {
  isModalOpen.value = false;
};
</script>

<style scoped>
.drawings-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
