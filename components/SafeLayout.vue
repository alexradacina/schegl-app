<template>
  <ion-page>
    <!-- App Header -->
    <slot name="header">
      <!-- default header (only shows if no #header slot passed) -->
      <ion-toolbar>
        <ion-title>Schlegl App</ion-title>
      </ion-toolbar>
    </slot>

    <!-- Main Content -->
    <ion-content fullscreen>
      <div class="page-content">
        <slot />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter } from '@ionic/vue'

import { StatusBar, Style } from '@capacitor/status-bar'
import { onMounted } from 'vue'

onMounted(async () => {
  // Make the status bar overlay webview (important for safe areas)

})
</script>

<style scoped>
/* Respect iOS safe areas */
.app-header {
  padding-top: env(safe-area-inset-top);
}

.app-footer {
  padding-bottom: env(safe-area-inset-bottom);
}

.page-content {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
