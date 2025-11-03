<template>
  <ion-modal
      ref="modalRef"
      :is-open="isOpen"
      @didDismiss="handleClose"
      @ionModalDidPresent="onModalDidPresent"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Route</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleClose">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="map-container">
        <!-- Added warning message for Directions API issues -->
        <div v-if="directionsApiWarning" class="directions-warning">
          <ion-icon :icon="warningOutline" />
          <div>
            <strong>Route display unavailable</strong>
            <p>{{ directionsApiWarning }}</p>
          </div>
        </div>

        <div v-if="routeInfo" class="route-info">
          <div class="route-info-item">
            <ion-icon :icon="timeOutline" />
            <span>{{ routeInfo.duration }}</span>
          </div>
          <div class="route-info-item">
            <ion-icon :icon="navigateOutline" />
            <span>{{ routeInfo.distance }}</span>
          </div>
        </div>

        <capacitor-google-map id="my-cool-map"
                              ref="mapRef"
                              style="display: inline-block; width: 100%; height: 400px"
        ></capacitor-google-map>
        <div v-if="mapError" class="map-error">
          <ion-icon :icon="alertCircleOutline" />
          <p>{{ mapError }}</p>
          <ion-button size="small" @click="retryMap">Retry</ion-button>
        </div>
        <div v-if="mapLoading" class="map-loading">
          <ion-spinner />
          <p>{{ mapLoadingText }}</p>
        </div>
      </div>

      <!-- Assignment Details -->
      <div class="assignment-details">
        <ion-card v-if="assignment">
          <ion-card-header>
            <ion-card-title>{{ assignment.order?.customer?.name || 'No Customer' }}</ion-card-title>
            <ion-card-subtitle v-if="assignment.address">
              {{ assignment.address.street }}<br />
              {{ assignment.address.postal_code }} {{ assignment.address.city }}
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-button
                expand="block"
                fill="outline"
                @click="openInGoogleMaps"
                v-if="assignment.address"
            >
              <ion-icon slot="start" :icon="navigateOutline" />
              View in Google Maps
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Open Job Button -->
        <ion-button expand="block" size="large" @click="openJob" class="open-job-button">
          Open Job
        </ion-button>
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
  IonSpinner,
} from '@ionic/vue'
import { closeOutline, navigateOutline, alertCircleOutline, timeOutline, warningOutline } from 'ionicons/icons'
import { ref, watch, shallowRef } from 'vue'
import { GoogleMap } from '@capacitor/google-maps'
import { Geolocation } from '@capacitor/geolocation'
import type { Assignment } from '@/stores/assignments'
import { useRouter } from 'vue-router'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { HTMLIonModalElement } from '@ionic/vue'

const props = defineProps<{
  isOpen: boolean
  assignment: Assignment | null
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const mapRef = ref<HTMLElement>()
const newMap = shallowRef<GoogleMap>()
const mapLoading = ref(false)
const mapError = ref('')
const mapLoadingText = ref('Loading map...')
const routeInfo = ref<{ duration: string; distance: string } | null>(null)
const directionsApiWarning = ref('')

const handleClose = () => {
  emit('close')
}

const openInGoogleMaps = () => {
  if (!props.assignment?.address) return

  const address = `${props.assignment.address.street}, ${props.assignment.address.postal_code} ${props.assignment.address.city}`
  const encodedAddress = encodeURIComponent(address)

  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank')
}

const openJob = () => {
  if (props.assignment) {
    handleClose()
    router.push(`/tabs/assignments/${props.assignment.id}`)
  }
}

const retryMap = () => {
  mapError.value = ''
  initMap()
}

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('[v0] No API key for geocoding')
      return null
    }

    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    )
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      console.log('[v0] Geocoded address to:', location)
      return { lat: location.lat, lng: location.lng }
    }

    console.warn('[v0] Geocoding failed:', data.status)
    return null
  } catch (error) {
    console.error('[v0] Geocoding error:', error)
    return null
  }
}

const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    console.log('[v0] Getting current location...')
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    })
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    }
    console.log('[v0] Current location:', location)
    return location
  } catch (error) {
    console.error('[v0] Error getting current location:', error)
    return null
  }
}

const getRoute = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
): Promise<any> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('[v0] No API key for routes')
      return null
    }

    const isNative = Capacitor.isNativePlatform()
    console.log('[v0] Fetching route from', origin, 'to', destination, 'on platform:', Capacitor.getPlatform())

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes'

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng
          }
        }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'METRIC'
    }

    let data
    if (isNative) {
      console.log('[v0] Making Routes API request with body:', JSON.stringify(requestBody, null, 2))
      const response = await CapacitorHttp.post({
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        },
        data: requestBody
      })
      console.log('[v0] Routes API response status:', response.status)
      console.log('[v0] Routes API response data:', JSON.stringify(response.data, null, 2))
      data = response.data
    } else {
      console.warn('[v0] Route display is only available on mobile devices due to CORS restrictions')
      return null
    }

    if (data.error) {
      console.error('[v0] Routes API error details:', JSON.stringify(data.error, null, 2))

      if (data.error.status === 'PERMISSION_DENIED' || data.error.message?.includes('blocked')) {
        directionsApiWarning.value = 'Routes API access denied. Please check:\n1. Routes API is enabled in Google Cloud Console\n2. API key has no application restrictions, OR\n3. iOS bundle ID (com.schlegl.app) is added to allowed iOS apps in API key restrictions'
      } else if (data.error.status === 'REQUEST_DENIED') {
        directionsApiWarning.value = 'Routes API request denied. Please enable billing for your Google Cloud project.'
      } else {
        directionsApiWarning.value = `Routes API error: ${data.error.message || data.error.status}`
      }
      return null
    }

    if (data.routes && data.routes.length > 0) {
      console.log('[v0] Route fetched successfully')
      return data.routes[0]
    }

    console.warn('[v0] Routes API returned no routes')
    directionsApiWarning.value = 'No route found between locations'
    return null
  } catch (error: any) {
    console.error('[v0] Error fetching route:', error)
    console.error('[v0] Error details:', JSON.stringify(error, null, 2))
    directionsApiWarning.value = `Failed to fetch route: ${error.message || 'Unknown error'}`
    return null
  }
}

const decodePolyline = (encoded: string): { lat: number; lng: number }[] => {
  const points: { lat: number; lng: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

const initMap = async () => {
  if (!mapRef.value || !props.assignment?.address) {
    console.log('[v0] Map initialization skipped: missing ref or address')
    return
  }

  mapLoading.value = true
  mapLoadingText.value = 'Loading map...'
  mapError.value = ''
  routeInfo.value = null
  directionsApiWarning.value = ''

  if (newMap.value) {
    await destroyMap()
  }

  try {
    console.log('[v0] Initializing map on platform:', Capacitor.getPlatform())

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.')
    }

    if (!mapRef.value) return

    const address = props.assignment.address
    const fullAddress = `${address.street}, ${address.postal_code} ${address.city}, Austria`
    console.log('[v0] Geocoding address:', fullAddress)

    mapLoadingText.value = 'Finding destination...'
    const destinationCoords = await geocodeAddress(fullAddress)

    if (!destinationCoords) {
      throw new Error('Could not find destination address')
    }

    mapLoadingText.value = 'Getting your location...'
    const currentLocation = await getCurrentLocation()

    let center = destinationCoords
    let zoom = 15

    console.log('[v0] Creating map with center:', center, 'zoom:', zoom)

    newMap.value = await GoogleMap.create({
      id: 'my-cool-map',
      element: mapRef.value,
      apiKey: apiKey,
      config: {
        center: center,
        zoom: zoom,
      },
    })

    if (!newMap.value) {
      throw new Error('Failed to create map')
    }

    if (currentLocation) {
      mapLoadingText.value = 'Calculating route...'
      //const route = await getRoute(currentLocation, destinationCoords)
      const route = false;
      if (route) {
        // Routes API returns duration as string like "1234s" and distance in meters
        const durationSeconds = parseInt(route.duration.replace('s', ''))
        const durationMinutes = Math.round(durationSeconds / 60)
        const distanceKm = (route.distanceMeters / 1000).toFixed(1)

        routeInfo.value = {
          duration: `${durationMinutes} min`,
          distance: `${distanceKm} km`,
        }
        console.log('[v0] Route info:', routeInfo.value)

        const polylinePoints = decodePolyline(route.polyline.encodedPolyline)
        console.log('[v0] Drawing route with', polylinePoints.length, 'points')

        await newMap.value.addPolylines([
          {
            path: polylinePoints,
            strokeColor: '#4285F4',
            strokeWidth: 5,
          },
        ])

        await newMap.value.addMarkers([
          {
            coordinate: currentLocation,
            title: 'Your Location',
            tintColor: { r: 76, g: 175, b: 80 },
          },
          {
            coordinate: destinationCoords,
            title: address.street,
            snippet: `${address.postal_code} ${address.city}`,
            tintColor: { r: 244, g: 67, b: 54 },
          },
        ])

        const bounds = {
          southwest: {
            lat: Math.min(currentLocation.lat, destinationCoords.lat) - 0.01,
            lng: Math.min(currentLocation.lng, destinationCoords.lng) - 0.01,
          },
          northeast: {
            lat: Math.max(currentLocation.lat, destinationCoords.lat) + 0.01,
            lng: Math.max(currentLocation.lng, destinationCoords.lng) + 0.01,
          },
        }

        await newMap.value.setCamera({
          bounds: bounds,
          padding: { top: 50, left: 50, bottom: 50, right: 50 },
        })
      } else {
        await newMap.value.addMarker({
          coordinate: destinationCoords,
          title: address.street,
          snippet: `${address.postal_code} ${address.city}`,
          tintColor: { r: 244, g: 67, b: 54 },
        })
      }
    } else {
      await newMap.value.addMarker({
        coordinate: destinationCoords,
        title: address.street,
        snippet: `${address.postal_code} ${address.city}`,
        tintColor: { r: 244, g: 67, b: 54 },
      })
    }

    mapLoading.value = false
    console.log('[v0] Map initialized successfully')
  } catch (error: any) {
    console.error('[v0] Error initializing map:', error)
    mapLoading.value = false
    mapError.value = error.message || 'Failed to load map. Please check your internet connection and try again.'
  }
}

const destroyMap = async () => {
  if (newMap.value) {
    try {
      await newMap.value.destroy()
      newMap.value = undefined
      console.log('[v0] Map destroyed')
    } catch (error) {
      console.error('[v0] Error destroying map:', error)
    }
  }
}

const modalRef = ref<HTMLIonModalElement>()

watch(() => props.isOpen, async (isOpen) => {
  if (!isOpen) {
    await destroyMap()
  }
})

const onModalDidPresent = () => {
  // Give time for modal to fully layout
  setTimeout(() => {
    if (!mapRef.value) return

    const rect = mapRef.value.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      console.warn('[v0] Map container has zero size, delaying init...')
      setTimeout(initMap, 200)
    } else {
      initMap()
    }
  }, 200)
}
</script>

<style scoped>
.map-container {
  height: 400px;
  width: 100%;
  position: relative;
}

/* Added route info display styles */
.route-info {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 16px;
  justify-content: center;
}

.route-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--ion-color-dark);
}

.route-info-item ion-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
}

.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
  padding: 2rem;
  text-align: center;
}

.map-error ion-icon {
  font-size: 48px;
  color: var(--ion-color-danger);
  margin-bottom: 1rem;
}

.map-error p {
  margin-bottom: 1rem;
  color: var(--ion-color-medium);
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
}

.map-loading p {
  margin-top: 1rem;
  color: var(--ion-color-medium);
}

.assignment-details {
  padding: 1rem;
}

.open-job-button {
  margin-top: 1rem;
}

ion-content {
  --height: 100%;
}

/* Added warning banner styles */
.directions-warning {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1001;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.directions-warning ion-icon {
  font-size: 24px;
  color: #ff9800;
  flex-shrink: 0;
  margin-top: 2px;
}

.directions-warning strong {
  display: block;
  color: #856404;
  margin-bottom: 4px;
  font-size: 14px;
}

.directions-warning p {
  margin: 0;
  color: #856404;
  font-size: 13px;
  line-height: 1.4;
}
</style>
