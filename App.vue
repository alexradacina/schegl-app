<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { onMounted } from 'vue'
import { StatusBar, Style } from '@capacitor/status-bar'

onMounted(async () => {
  try {
    // Do NOT overlay the webview
    await StatusBar.setOverlaysWebView({ overlay: false })

    // Ensure bottom safe area for iPhone/iPad home indicator
    document.documentElement.style.setProperty(
        '--ion-safe-area-bottom',
        'env(safe-area-inset-bottom)'
    )
  } catch (e) {
    console.warn('StatusBar plugin not available', e)
  }
})
</script>
