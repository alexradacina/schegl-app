<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" class="fullscreen-modal">
    <ion-page>
      <ion-header>
        <ion-toolbar class="drawing-toolbar">
          <div class="toolbar-content">
            <!-- First row: tools, colors, and sizes -->
            <div class="toolbar-row toolbar-row-top">
              <div class="tool-section">
                <button
                    class="tool-btn"
                    :class="{ active: currentTool === 'pencil' }"
                    @click="selectTool('pencil')"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>

                <button
                    class="tool-btn"
                    :class="{ active: currentTool === 'eraser' }"
                    @click="selectTool('eraser')"
                >
                  <!-- Updated eraser icon to match reference (tilted rectangle) -->
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 21h10M5.5 13.5l-2.121 2.121a2 2 0 0 0 0 2.828l2.172 2.172a2 2 0 0 0 2.828 0L20.5 8.5a2 2 0 0 0 0-2.828l-2.172-2.172a2 2 0 0 0-2.828 0L5.5 13.5z"/>
                  </svg>
                </button>

                <button
                    class="tool-btn"
                    :class="{ active: currentTool === 'select' }"
                    @click="selectTool('select')"
                >
                  <!-- Updated select icon to simpler four-arrow design -->
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>
                    <polyline points="9 5 12 2 15 5"/>
                    <polyline points="5 9 2 12 5 15"/>
                    <polyline points="15 19 12 22 9 19"/>
                    <polyline points="19 15 22 12 19 9"/>
                  </svg>
                </button>

                <button
                    class="tool-btn"
                    :class="{ active: currentTool === 'image' }"
                    @click="selectTool('image')"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </button>
              </div>

              <!-- Added spacing divider between sections -->
              <div class="divider"></div>

              <!-- Color picker for pencil tool -->
              <div class="color-section" v-show="currentTool === 'pencil'">
                <div class="line-sizes">
                  <button
                      v-for="size in lineSizes"
                      :key="size.value"
                      class="size-btn"
                      :class="{ active: pencilOptions.strokeWidth === size.value }"
                      @click="pencilOptions.strokeWidth = size.value"
                  >
                    <div class="size-dot" :style="{ width: size.display + 'px', height: size.display + 'px' }"></div>
                  </button>
                </div>

                <div class="divider"></div>

                <!-- Simplified color swatches to avoid linter false positive -->
                <div class="color-picker">
                  <div
                      class="color-swatch color-black"
                      :class="{ active: pencilOptions.color === '#000000' }"
                      @click="pencilOptions.color = '#000000'"
                  ></div>

                  <div
                      class="color-swatch color-blue"
                      :class="{ active: pencilOptions.color === '#0000ff' }"
                      @click="pencilOptions.color = '#0000ff'"
                  ></div>

                  <div
                      class="color-swatch color-red"
                      :class="{ active: pencilOptions.color === '#ff0000' }"
                      @click="pencilOptions.color = '#ff0000'"
                  ></div>

                  <div
                      class="color-swatch color-yellow"
                      :class="{ active: pencilOptions.color === '#ffeb3b' }"
                      @click="pencilOptions.color = '#ffeb3b'"
                  ></div>

                  <!-- Color picker button with popover -->
                  <div class="color-picker-btn" @click="showColorPopover = true">
                    <div class="rainbow-swatch"></div>
                  </div>
                </div>
              </div>

              <div class="spacer"></div>


            </div>

            <!-- Second row: action buttons (undo, redo, clear, download, close) -->
            <div class="toolbar-row toolbar-row-actions">
              <!-- Made canvas size editable with input fields -->
              <div class="size-info">
                <input
                    type="number"
                    v-model.number="canvasSize.width"
                    @change="resizeCanvas"
                    class="size-input"
                    min="100"
                />
                <span class="size-separator">×</span>
                <input
                    type="number"
                    v-model.number="canvasSize.height"
                    @change="resizeCanvas"
                    class="size-input"
                    min="100"
                />
                <!-- Made fit to screen button bigger to match left icons -->
                <button class="action-btn" @click="fitToScreen" title="Fit to screen">
                  <ion-icon :icon="expandOutline"></ion-icon>
                </button>
              </div>
              <div class="action-section">
                <button class="action-btn" @click="undo" :disabled="!canUndo" title="Undo">
                  <ion-icon :icon="arrowUndoOutline"></ion-icon>
                </button>
                <button class="action-btn" @click="redo" :disabled="!canRedo" title="Redo">
                  <ion-icon :icon="arrowRedoOutline"></ion-icon>
                </button>
                <button class="action-btn" @click="confirmClearCanvas" title="Clear all">
                  <ion-icon :icon="trashOutline"></ion-icon>
                </button>
                <button class="action-btn" @click="downloadCanvas" title="Download">
                  <ion-icon :icon="downloadOutline"></ion-icon>
                </button>
                <button class="action-btn" @click="handleClose" title="Close">
                  <ion-icon :icon="closeOutline"></ion-icon>
                </button>
              </div>
            </div>
          </div>
        </ion-toolbar>
      </ion-header>

      <!-- Wrapped ion-content in a div with custom scrollbar -->
      <div class="content-wrapper">
        <ion-content :scroll-y="true" :scroll-x="true" ref="contentRef" class="drawing-content">
          <div class="canvas-wrapper">
            <div class="canvas-container" :class="{ 'no-grid': isTemplateDrawing }">
              <canvas id="drawing-canvas" ref="canvasEl"></canvas>
            </div>

            <button class="expand-btn" @click="expandCanvas" title="Add more height">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            <!-- Moved button further left to avoid scrollbar overlap -->
            <button v-if="props.initialImageUrl" class="load-template-btn" @click="loadTemplateImage">
              + Load Template
            </button>
          </div>
        </ion-content>

        <!-- Added custom visible scrollbar overlay for iPad -->
        <div v-if="isIPad" class="custom-scrollbar-overlay">
          <div class="scrollbar-track-vertical">
            <div
                class="scrollbar-thumb-vertical"
                :style="{
                height: scrollThumbHeight + 'px',
                transform: `translateY(${scrollThumbTop}px)`
              }"
                @touchstart="startScrollDrag"
                @mousedown="startScrollDrag"
            ></div>
          </div>
        </div>
      </div>
    </ion-page>

    <!-- Added Ionic popover for color selection on iPad -->
    <ion-popover
        :is-open="showColorPopover"
        @didDismiss="showColorPopover = false"
        :show-backdrop="true"
    >
      <div class="color-popover-content">
        <h4>Select Color</h4>
        <div class="color-grid">
          <div
              v-for="color in allColors"
              :key="color.value"
              class="color-option"
              :class="{ active: pencilOptions.color === color.value }"
              :style="{ backgroundColor: color.value }"
              @click="selectColor(color.value)"
          >
            <ion-icon v-if="pencilOptions.color === color.value" :icon="checkmarkOutline" />
          </div>
        </div>
      </div>
    </ion-popover>
  </ion-modal>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch, onUnmounted } from 'vue';
import {
  IonModal, IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonButtons, IonChip, IonLabel, alertController,
  IonPopover // Added IonPopover
} from '@ionic/vue';
import {
  pencilOutline, trashOutline, downloadOutline,
  imageOutline, handRightOutline, arrowUndoOutline,
  arrowRedoOutline, closeOutline, checkmarkCircleOutline,
  cloudUploadOutline, expandOutline, checkmarkOutline // Added checkmarkOutline
} from 'ionicons/icons';
import { fabric } from 'fabric';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useImagePicker } from '@/composables/useImagePicker';
import { useOrderResults } from '@/composables/useOrderResults';
import { useTemplatesStore } from '@/stores/templates'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  drawingId: {
    type: String,
    required: true
  },
  initialImageUrl: {
    type: String,
    default: ''
  },
  orderId: {
    type: Number,
    default: null
  },
  machineOrderId: {
    type: Number,
    default: null
  },
  resultType: {
    type: String,
    default: 'notes', // 'notes' or 'template'
    validator: (value) => ['notes', 'template'].includes(value)
  }
});

const emit = defineEmits(['close']);

const isNative = Capacitor.isNativePlatform();
const isIPad = Capacitor.getPlatform() === 'ios' && isNative;

console.log('[v0] Platform detection - isNative:', isNative, 'platform:', Capacitor.getPlatform(), 'isIPad:', isIPad);

const currentTool = ref('pencil');
const canvasEl = ref(null);
const contentRef = ref(null);
let canvas = null;
let drawingModeInitialized = false;

const canvasSize = reactive({
  width: 0,
  height: 0
});

const history = ref([]);
const historyIndex = ref(-1);
const maxHistorySteps = 50;

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

const pencilOptions = reactive({
  strokeWidth: 3,
  color: '#000000'
});

const lineSizes = [
  { name: 'XS', value: 1, display: 6 },
  { name: 'S', value: 3, display: 10 },
  { name: 'M', value: 5, display: 14 },
  { name: 'L', value: 8, display: 18 }
];

const predefinedColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Yellow', value: '#ffeb3b' }
];

const allColors = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#808080' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Orange', value: '#ff8800' },
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Teal', value: '#00ffff' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Purple', value: '#8800ff' },
  { name: 'Pink', value: '#ff00ff' },
  { name: 'Brown', value: '#8b4513' },
  { name: 'Dark Red', value: '#8b0000' },
  { name: 'Dark Orange', value: '#ff6600' },
  { name: 'Gold', value: '#ffd700' },
  { name: 'Dark Green', value: '#006400' },
  { name: 'Dark Teal', value: '#008b8b' },
  { name: 'Dark Blue', value: '#00008b' },
  { name: 'Dark Purple', value: '#4b0082' },
  { name: 'Dark Pink', value: '#c71585' },
];

const tools = [
  { name: 'pencil', icon: pencilOutline },
  { name: 'eraser', icon: trashOutline },
  { name: 'image', icon: imageOutline },
  { name: 'select', icon: handRightOutline }
];

const saveStatus = ref('saved');
let saveTimeout = null;

const isTemplateDrawing = computed(() => {
  // If drawingId contains 'template', it's a template drawing
  return props.drawingId && props.drawingId.includes('template');
});

const showColorPopover = ref(false); // Added popover state

const { createOrderResult, updateOrderResult, canvasToBlob } = useOrderResults();
let existingResultId = ref(null);

const templatesStore = useTemplatesStore()

const cachedImageUrl = ref('')

const handleClose = async () => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value);
    autoSaveInterval.value = null;
  }
  await saveDrawingToAPI();
  cleanupCanvas();
  emit('close');
};

const cleanupCanvas = () => {
  if (canvas) {
    canvas.off(); // Remove all event listeners
    canvas.dispose(); // Properly dispose of the canvas
    canvas = null;
  }

  drawingModeInitialized = false;
  history.value = [];
  historyIndex.value = -1;
};

const saveDrawing = async () => {
  if (!canvas) return;

  saveStatus.value = 'saving';

  const json = canvas.toJSON(['data']);
  const data = {
    canvas: json,
    width: canvasSize.width,
    height: canvasSize.height,
    timestamp: Date.now()
  };

  try {
    const jsonData = JSON.stringify(data);

    // Save locally (filesystem or localStorage)
    if (isNative) {
      await Filesystem.writeFile({
        path: `drawings/drawing_${props.drawingId}.json`,
        data: jsonData,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      console.log('[v0] Drawing saved to filesystem (native)');
    } else {
      localStorage.setItem(`drawing_${props.drawingId}`, jsonData);
      console.log('[v0] Drawing saved to localStorage (web)');
    }

    saveStatus.value = 'saved';
  } catch (error) {
    console.error('[v0] Error saving drawing:', error);
    saveStatus.value = 'error';
  }
};

const saveDrawingToAPI = async () => {
  if (!canvas || !props.orderId) {
    console.log('[v0] Skipping API save - canvas:', !!canvas, 'orderId:', props.orderId);
    return;
  }

  console.log('[v0] Saving drawing to API - orderId:', props.orderId, 'machineOrderId:', props.machineOrderId, 'type:', props.resultType);

  const json = canvas.toJSON(['data']);

  let imageBlob;
  if (props.resultType === 'notes') {
    // Create temp canvas with background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw grid lines
    tempCtx.strokeStyle = '#e0f0ff';
    tempCtx.lineWidth = 1;

    for (let x = 0; x <= tempCanvas.width; x += 20) {
      tempCtx.beginPath();
      tempCtx.moveTo(x, 0);
      tempCtx.lineTo(x, tempCanvas.height);
      tempCtx.stroke();
    }

    for (let y = 0; y <= tempCanvas.height; y += 20) {
      tempCtx.beginPath();
      tempCtx.moveTo(0, y);
      tempCtx.lineTo(tempCanvas.width, y);
      tempCtx.stroke();
    }

    // Draw canvas content on top
    const canvasDataURL = canvas.toDataURL('image/png');
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = canvasDataURL;
    });
    tempCtx.drawImage(img, 0, 0);

    // Convert to blob
    imageBlob = await new Promise(resolve => {
      tempCanvas.toBlob(resolve, 'image/png', 1);
    });
  } else {
    // For templates, use regular canvas export
    imageBlob = await canvasToBlob(canvas);
  }

  try {
    const result = await createOrderResult(
        props.orderId,
        props.resultType,
        json,
        imageBlob || undefined,
        props.machineOrderId || null
    );

    if (result.success) {
      existingResultId.value = result.result?.id || existingResultId.value;
      console.log('[v0] Drawing saved to API successfully, result ID:', existingResultId.value);
    } else {
      console.error('[v0] Failed to save drawing to API:', result.message);
    }
  } catch (error) {
    console.error('[v0] Error saving to API:', error);
  }
};

const loadDrawing = async () => {
  console.log('[v0] loadDrawing called, drawingId:', props.drawingId, 'initialImageUrl:', props.initialImageUrl);

  try {
    let dataString;

    if (isNative) {
      const result = await Filesystem.readFile({
        path: `drawings/drawing_${props.drawingId}.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      dataString = result.data;
    } else {
      dataString = localStorage.getItem(`drawing_${props.drawingId}`);
    }

    if (!dataString) {
      console.log('[v0] No existing drawing found, checking for initial image');

      if (props.initialImageUrl) {
        console.log('[v0] Loading initial image:', props.initialImageUrl);
        await loadInitialImage(props.initialImageUrl);
      }
      return;
    }

    const data = JSON.parse(dataString);
    console.log('[v0] Loaded drawing data:', data);

    canvasSize.width = data.width;
    canvasSize.height = data.height;
    canvas.setWidth(canvasSize.width);
    canvas.setHeight(canvasSize.height);

    canvas.loadFromJSON(data.canvas, () => {
      canvas.renderAll();

      const objects = canvas.getObjects();
      console.log('[v0] Canvas loaded with', objects.length, 'objects');

      if (objects.length === 0 && props.initialImageUrl) {
        console.log('[v0] Canvas is empty, loading initial image:', props.initialImageUrl);
        loadInitialImage(props.initialImageUrl);
      } else {
        saveToHistory();
      }
    });
  } catch (error) {
    console.log('[v0] No existing drawing found or error loading:', error);

    if (props.initialImageUrl) {
      console.log('[v0] Loading initial image after error:', props.initialImageUrl);
      await loadInitialImage(props.initialImageUrl);
    }
  }
};

watch(() => props.initialImageUrl, async (newUrl) => {
  if (newUrl && newUrl.startsWith('http')) {
    // Try to find this URL in templates and load cached version
    const template = templatesStore.templates.find(t =>
        t.image_src === newUrl || t.original_image === newUrl
    )
    if (template) {
      cachedImageUrl.value = await templatesStore.getTemplateImageUrl(template)
    } else {
      cachedImageUrl.value = newUrl
    }
  } else {
    cachedImageUrl.value = newUrl
  }
}, { immediate: true })

const loadInitialImage = async (imageUrl) => {
  if (!canvas || !imageUrl) {
    console.log('[v0] Cannot load initial image - canvas:', !!canvas, 'imageUrl:', imageUrl);
    return;
  }

  const urlToLoad = cachedImageUrl.value || imageUrl

  console.log('[v0] Loading initial image:', urlToLoad);

  try {
    fabric.Image.fromURL(urlToLoad, (img) => {
      if (!img) {
        console.error('[v0] Failed to load image from URL');
        return;
      }

      console.log('[v0] Image loaded successfully, dimensions:', img.width, 'x', img.height);

      const scale = canvas.width / img.width;
      img.scale(scale);

      const scaledWidth = img.width * img.scaleX;
      const scaledHeight = img.height * img.scaleY;

      if (scaledHeight > canvas.height) {
        canvasSize.height = scaledHeight + 40; // Add some padding
        canvas.setHeight(canvasSize.height);
        console.log('[v0] Canvas height adjusted to:', canvasSize.height);
      }

      const left = 0;
      const top = 0;

      console.log('[v0] Positioning image at:', left, top, 'with scale:', scale);

      img.set({
        left: left,
        top: top,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: false,
        data: { isTemplate: true }
      });

      canvas.add(img);
      img.sendToBack();
      canvas.renderAll();
      saveToHistory();

      setTimeout(() => {
        updateScrollbar();
      }, 100);

      console.log('[v0] Initial image loaded and added to canvas as locked template');
    }, { crossOrigin: 'anonymous' });
  } catch (error) {
    console.error('[v0] Error loading initial image:', error);
  }
};

const fitToScreen = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));

  if (contentRef.value && contentRef.value.$el) {
    const contentElement = contentRef.value.$el;
    const rect = contentElement.getBoundingClientRect();

    const padding = 40;

    canvasSize.width = rect.width - padding;
    canvasSize.height = rect.height - padding;

    resizeCanvas();
  }
};

const resizeCanvas = async () => {
  if (!canvas) return;

  canvas.setWidth(canvasSize.width);
  canvas.setHeight(canvasSize.height);
  canvas.renderAll();

  setTimeout(() => {
    updateScrollbar();
  }, 100);

  debouncedSave();
};

const initializeDrawingMode = () => {
  if (!canvas || drawingModeInitialized) return;

  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.color = pencilOptions.color;
  canvas.freeDrawingBrush.width = pencilOptions.strokeWidth;

  canvas.on('path:created', async () => {
    const objects = canvas.getObjects();
    const lastObject = objects[objects.length - 1];
    if (lastObject) {
      lastObject.selectable = currentTool.value === 'select';
      lastObject.evented = currentTool.value === 'select';
    }

    saveToHistory();
    debouncedSave();
  });

  drawingModeInitialized = true;
};

const selectTool = (toolName) => {
  currentTool.value = toolName;

  initializeDrawingMode();

  if (canvas) {
    canvas.off('mouse:down', handleEraserClick);

    if (toolName === 'pencil') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.freeDrawingBrush.color = pencilOptions.color;
      canvas.freeDrawingBrush.width = pencilOptions.strokeWidth;

      canvas.getObjects().forEach(obj => {
        obj.selectable = false;
        obj.evented = false;
      });

      canvas.skipTargetFind = true;

    } else if (toolName === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;

      canvas.getObjects().forEach(obj => {
        if (obj.data?.isTemplate) {
          obj.selectable = false;
          obj.evented = false;
        } else {
          obj.selectable = true;
          obj.evented = true;
          obj.hoverCursor = 'pointer';
        }
      });

      canvas.skipTargetFind = false;
      canvas.on('mouse:down', handleEraserClick);

    } else if (toolName === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;

      canvas.getObjects().forEach(obj => {
        if (obj.data?.isTemplate) {
          obj.selectable = false;
          obj.evented = false;
        } else {
          obj.selectable = true;
          obj.evented = true;
          obj.hoverCursor = 'move';
        }
      });

      canvas.skipTargetFind = false;

    } else if (toolName === 'image') {
      canvas.isDrawingMode = false;
      canvas.selection = false;

      canvas.getObjects().forEach(obj => {
        obj.selectable = false;
        obj.evented = false;
      });

      canvas.skipTargetFind = true;

      // Trigger image picker
      addImage();
    }

    canvas.renderAll();
  }
};

const handleEraserClick = async (e) => {
  if (currentTool.value === 'eraser' && e.target) {
    canvas.remove(e.target);
    canvas.renderAll();
    saveToHistory();
    debouncedSave();
  }
};

const updatePencilOptions = () => {
  if (canvas && canvas.freeDrawingBrush && currentTool.value === 'pencil') {
    canvas.freeDrawingBrush.color = pencilOptions.color;
    canvas.freeDrawingBrush.width = pencilOptions.strokeWidth;
  }
};

const debouncedSave = () => {
  saveStatus.value = 'saving';

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveDrawing();
  }, 1000);
};

const selectColor = (color) => {
  pencilOptions.color = color;
  showColorPopover.value = false;
};

const openColorPicker = () => {
  colorInputRef.value.click();
};

const autoSaveInterval = ref(null);

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!canvas) {
      await initCanvas();
    } else {
      await loadDrawing();
    }

    if (props.orderId && !autoSaveInterval.value) {
      autoSaveInterval.value = setInterval(async () => {
        console.log('[v0] Auto-saving drawing to API');
        await saveDrawingToAPI();
      }, 120000); // 2 minutes = 120000ms
    }
  } else {
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value);
      autoSaveInterval.value = null;
    }

    if (canvas) {
      await saveDrawing();
      cleanupCanvas();
    }
  }
});

watch(() => pencilOptions.color, (newColor) => {
  console.log('[v0] Color changed to:', newColor);
  if (canvas && canvas.freeDrawingBrush && currentTool.value === 'pencil') {
    canvas.freeDrawingBrush.color = newColor;
    console.log('[v0] Canvas brush color updated to:', newColor);
  }
});

watch(() => pencilOptions.strokeWidth, (newWidth) => {
  console.log('[v0] Stroke width changed to:', newWidth);
  if (canvas && canvas.freeDrawingBrush && currentTool.value === 'pencil') {
    canvas.freeDrawingBrush.width = newWidth;
    console.log('[v0] Canvas brush width updated to:', newWidth);
  }
});

const initCanvas = async () => {
  console.log('[v0] Initializing canvas');

  await fitToScreen();

  const initialDrawingMode = false;
  console.log('[v0] Initial drawing mode:', initialDrawingMode, 'isIPad:', isIPad);

  canvas = new fabric.Canvas('drawing-canvas', {
    isDrawingMode: initialDrawingMode,
    selection: false,
    width: canvasSize.width,
    height: canvasSize.height,
    renderOnAddRemove: false,
    stateful: false,
    skipTargetFind: true,
    enableRetinaScaling: true,
    allowTouchScrolling: isIPad
  });

  if (isIPad && canvas.upperCanvasEl) {
    console.log('[v0] Setting up Apple Pencil detection for iPad');

    canvas.upperCanvasEl.addEventListener('pointerdown', (e) => {
      console.log('[v0] 🖊️ Pointer down - Type:', e.pointerType, 'Tool:', currentTool.value);

      if (currentTool.value === 'pencil') {
        if (e.pointerType === 'touch') {
          // Finger touch - disable drawing, allow scrolling
          console.log('[v0] ❌ FINGER detected - DISABLING drawing mode, allowing scroll');
          canvas.isDrawingMode = false;
          // Don't call e.stopPropagation() or e.preventDefault() to allow scrolling
        } else if (e.pointerType === 'pen') {
          // Apple Pencil - enable drawing
          console.log('[v0] ✅ APPLE PENCIL detected - ENABLING drawing mode');
          canvas.isDrawingMode = true;
          e.preventDefault(); // Prevent scrolling when drawing with pencil
        }
      }
    }, { capture: true });

    canvas.upperCanvasEl.addEventListener('pointerup', (e) => {
      console.log('[v0] 🖊️ Pointer up - Type:', e.pointerType);
    }, { capture: true });
  }

  initializeDrawingMode();
  selectTool('pencil');

  await loadDrawing();

  if (history.value.length === 0) {
    saveToHistory();
  }

  console.log('[v0] Canvas initialized:', canvasSize.width, 'x', canvasSize.height);

  if (isIPad) {
    setTimeout(() => {
      setupScrollbar();
      updateScrollbar();
    }, 500);
  }
};

const addImage = async () => {
  console.log('[v0] ===== ADD IMAGE STARTED =====');
  console.log('[v0] Current tool:', currentTool.value);

  const imageData = await pickImage();

  console.log('[v0] pickImage returned, imageData exists:', !!imageData);
  console.log('[v0] imageData length:', imageData?.length || 0);

  if (!imageData) {
    console.log('[v0] No image selected, switching back to pencil tool');
    selectTool('pencil');
    return;
  }

  console.log('[v0] Loading image into Fabric.js canvas');

  try {
    const img = await new Promise((resolve) => {
      fabric.Image.fromURL(imageData, resolve, { crossOrigin: 'anonymous' });
    });

    if (!img) {
      console.error('[v0] ❌ Fabric.Image.fromURL returned null/undefined');
      selectTool('pencil');
      return;
    }

    console.log('[v0] ✅ Image loaded successfully');
    console.log('[v0] Image dimensions:', img.width, 'x', img.height);
    console.log('[v0] Canvas dimensions:', canvas.width, 'x', canvas.height);

    const maxWidth = canvas.width * 0.8;
    const maxHeight = canvas.height * 0.8;

    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    img.scale(scale);
    console.log('[v0] Image scaled by', scale);

    const scaledWidth = img.width * img.scaleX;
    const scaledHeight = img.height * img.scaleY;
    const left = canvas.width / 2 - scaledWidth / 2;
    const top = canvas.height / 2 - scaledHeight / 2;

    console.log('[v0] Positioning image at:', left, top);

    img.set({
      left: left,
      top: top,
      selectable: true,
      evented: true
    });

    console.log('[v0] Adding image to canvas');
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();

    console.log('[v0] Canvas now has', canvas.getObjects().length, 'objects');

    saveToHistory();
    debouncedSave();

    console.log('[v0] ✅ Image added successfully, switching to select tool');

    // Switch to select tool after adding image
    selectTool('select');
  } catch (error) {
    console.error('[v0] ❌ Error in addImage:', error);
    selectTool('pencil');
  }

  console.log('[v0] ===== ADD IMAGE COMPLETED =====');
};

const saveToHistory = () => {
  const json = canvas.toJSON(['data']);

  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }

  history.value.push({
    canvas: json
  });

  if (history.value.length > maxHistorySteps) {
    history.value = history.value.slice(history.value.length - maxHistorySteps);
  }

  historyIndex.value = history.value.length - 1;
};

const undo = async () => {
  if (!canUndo.value) return;

  historyIndex.value--;
  restoreFromHistory();
  debouncedSave();
};

const redo = async () => {
  if (!canRedo.value) return;

  historyIndex.value++;
  restoreFromHistory();
  debouncedSave();
};

const restoreFromHistory = () => {
  const state = history.value[historyIndex.value];

  canvas.loadFromJSON(state.canvas, () => {
    const tool = currentTool.value;

    canvas.getObjects().forEach(obj => {
      if (obj.data?.isTemplate) {
        obj.selectable = false;
        obj.evented = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
        obj.lockScalingX = true;
        obj.lockScalingY = true;
        obj.lockRotation = true;
        obj.hasControls = false;
        obj.hasBorders = false;
      } else if (tool === 'select' || tool === 'eraser') {
        obj.selectable = true;
        obj.evented = true;
        obj.hoverCursor = tool === 'select' ? 'move' : 'pointer';
      } else {
        obj.selectable = false;
        obj.evented = false;
      }

      if (obj.type === 'image' && obj.data?.isTemplate) {
        obj.sendToBack();
      }
    });

    canvas.renderAll();
  });
};

const confirmClearCanvas = async () => {
  const alert = await alertController.create({
    header: 'Clear Canvas',
    message: 'Are you sure you want to clear the entire canvas?',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Clear',
        handler: () => {
          clearCanvas();
        }
      }
    ]
  });

  await alert.present();
};

const clearCanvas = async () => {
  canvas.clear();
  canvas.renderAll();
  saveToHistory();
  debouncedSave();
};

const downloadCanvas = () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  tempCtx.strokeStyle = '#e0f0ff';
  tempCtx.lineWidth = 1;

  for (let x = 0; x <= tempCanvas.width; x += 20) {
    tempCtx.beginPath();
    tempCtx.moveTo(x, 0);
    tempCtx.lineTo(x, tempCanvas.height);
    tempCtx.stroke();
  }

  for (let y = 0; y <= tempCanvas.height; y += 20) {
    tempCtx.beginPath();
    tempCtx.moveTo(0, y);
    tempCtx.lineTo(tempCanvas.width, y);
    tempCtx.stroke();
  }

  const canvasDataURL = canvas.toDataURL('image/png');
  const img = new Image();
  img.onload = () => {
    tempCtx.drawImage(img, 0, 0);

    const dataURL = tempCanvas.toDataURL('image/png', 1);
    const link = document.createElement('a');
    link.download = `drawing_${props.drawingId}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.src = canvasDataURL;
};

const expandCanvas = () => {
  canvasSize.height += 200;
  resizeCanvas();

  setTimeout(() => {
    updateScrollbar();
  }, 100);
};

const loadTemplateImage = async () => {
  console.log('[v0] loadTemplateImage called, initialImageUrl:', props.initialImageUrl)
  const imageUrl = cachedImageUrl.value || props.initialImageUrl
  if (imageUrl) {
    await loadInitialImage(imageUrl)
  } else {
    console.log('[v0] No initialImageUrl provided')
  }
};

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value);
    autoSaveInterval.value = null;
  }

  document.removeEventListener('touchmove', handleScrollDrag);
  document.removeEventListener('touchend', stopScrollDrag);
  document.removeEventListener('mousemove', handleScrollDrag);
  document.removeEventListener('mouseup', stopScrollDrag);

  window.removeEventListener('resize', updateScrollbar);

  cleanupCanvas();
});

const setupScrollbar = () => {
  if (!contentRef.value || !isIPad) {
    console.log('[v0] Cannot setup scrollbar - contentRef:', !!contentRef.value, 'isIPad:', isIPad);
    return;
  }

  console.log('[v0] Setting up scrollbar for iPad');

  const content = contentRef.value.$el;
  const scrollElement = content.shadowRoot?.querySelector('.inner-scroll') || content;

  if (scrollElement) {
    console.log('[v0] Scroll element found, adding scroll listener');
    scrollElement.addEventListener('scroll', () => {
      console.log('[v0] Scroll event detected');
      updateScrollbar();
    });

    // Also update on resize
    window.addEventListener('resize', updateScrollbar);
  } else {
    console.log('[v0] ⚠️ Scroll element not found');
  }
};

const updateScrollbar = () => {
  if (!contentRef.value || !isIPad) return;

  const content = contentRef.value.$el;
  const scrollElement = content.shadowRoot?.querySelector('.inner-scroll') || content;

  if (scrollElement) {
    const scrollHeight = scrollElement.scrollHeight;
    const clientHeight = scrollElement.clientHeight;
    const scrollTop = scrollElement.scrollTop;

    console.log('[v0] Scrollbar update - scrollHeight:', scrollHeight, 'clientHeight:', clientHeight, 'scrollTop:', scrollTop);

    const thumbHeight = Math.max(60, (clientHeight / scrollHeight) * clientHeight);
    scrollThumbHeight.value = thumbHeight;

    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - thumbHeight;
    scrollThumbTop.value = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    console.log('[v0] Thumb height:', thumbHeight, 'Thumb top:', scrollThumbTop.value);
  }
};

const startScrollDrag = (e) => {
  console.log('[v0] Start scroll drag');
  isDraggingScroll.value = true;
  dragStartY.value = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

  const content = contentRef.value.$el;
  const scrollElement = content.shadowRoot?.querySelector('.inner-scroll') || content;
  scrollStartY.value = scrollElement.scrollTop;

  document.addEventListener('touchmove', handleScrollDrag, { passive: false });
  document.addEventListener('touchend', stopScrollDrag);
  document.addEventListener('mousemove', handleScrollDrag);
  document.addEventListener('mouseup', stopScrollDrag);

  e.preventDefault();
  e.stopPropagation();
};

const handleScrollDrag = (e) => {
  if (!isDraggingScroll.value) return;

  const currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
  const deltaY = currentY - dragStartY.value;

  const content = contentRef.value.$el;
  const scrollElement = content.shadowRoot?.querySelector('.inner-scroll') || content;

  const scrollHeight = scrollElement.scrollHeight;
  const clientHeight = scrollElement.clientHeight;
  const maxScroll = scrollHeight - clientHeight;
  const maxThumbTop = clientHeight - scrollThumbHeight.value;

  const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
  scrollElement.scrollTop = scrollStartY.value + scrollDelta;

  console.log('[v0] Dragging scroll - deltaY:', deltaY, 'new scrollTop:', scrollElement.scrollTop);

  e.preventDefault();
};

const stopScrollDrag = () => {
  console.log('[v0] Stop scroll drag');
  isDraggingScroll.value = false;
  document.removeEventListener('touchmove', handleScrollDrag);
  document.removeEventListener('touchend', stopScrollDrag);
  document.removeEventListener('mousemove', handleScrollDrag);
  document.removeEventListener('mouseup', stopScrollDrag);
};

const { pickImage } = useImagePicker();

const scrollThumbHeight = ref(0);
const scrollThumbTop = ref(0);
const isDraggingScroll = ref(false);
const dragStartY = ref(0);
const scrollStartY = ref(0);

const colorInputRef = ref(null); // Declared colorInputRef
</script>

<style scoped>
.fullscreen-modal {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
}

.drawing-toolbar {
  --background: #f8f9fa;
  --min-height: 100px;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.toolbar-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Align second toolbar row items to the right */
.toolbar-row-actions {
  display: flex;
  justify-content: flex-end;
}

.tool-section {
  display: flex;
  gap: 8px;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background-color: transparent;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background-color: #e9ecef;
}

.tool-btn.active {
  background-color: #4a9eff;
  color: white;
}

.color-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.line-sizes {
  display: flex;
  gap: 8px;
  align-items: center;
}

.size-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-btn:hover {
  background-color: #f8f9fa;
}

.size-btn.active {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.size-dot {
  background-color: #000;
  border-radius: 50%;
}

.color-picker {
  display: flex;
  gap: 10px;
  align-items: center;
}

.spacer {
  flex: 1;
}

.action-section {
  display: flex;
  gap: 4px;
}

.canvas-wrapper {
  position: relative;
  min-height: 100%;
  display: flex;
  justify-content: center;
  padding: 20px;
  padding-right: 60px; /* Extra padding for custom scrollbar on iPad */
}

.canvas-container.no-grid {
  background-image: none;
  background-color: #ffffff;
}

.canvas-container {
  display: inline-block;
  background-image:
      linear-gradient(#e0f0ff 1px, transparent 1px),
      linear-gradient(90deg, #e0f0ff 1px, transparent 1px);
  background-size: 20px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  /* Removed touch-action: none to allow finger scrolling on iPad while Apple Pencil draws */
}

.expand-btn {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #dee2e6;
  background-color: white;
  color: #495057;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  z-index: 1000;
}

.expand-btn:hover {
  background-color: #f8f9fa;
  transform: scale(1.05);
}

.expand-btn:active {
  transform: scale(0.95);
}

.load-template-btn {
  position: fixed;
  bottom: 20px;
  right: 80px; /* Moved further left to avoid scrollbar overlap */
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid #dee2e6;
  background-color: white;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  z-index: 1000;
}

.load-template-btn:hover {
  background-color: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.load-template-btn:active {
  transform: translateY(0);
}

.divider {
  width: 1px;
  height: 32px;
  background-color: #dee2e6;
  margin: 0 8px;
}

.size-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.size-input {
  width: 65px;
  height: 32px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  color: #495057;
  text-align: center;
  background-color: white;
}

.size-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.size-separator {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
  border: 2px solid transparent;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.color-black {
  background-color: #000000;
}

.color-swatch.color-blue {
  background-color: #0000ff;
}

.color-swatch.color-red {
  background-color: #ff0000;
}

.color-swatch.color-yellow {
  background-color: #ffeb3b;
  border-color: #ddd;
}

.color-swatch.active {
  border-color: #4a9eff;
  border-width: 3px;
}

.rainbow-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg,
  red 0%,
  yellow 17%,
  lime 33%,
  cyan 50%,
  blue 67%,
  magenta 83%,
  red 100%
  );
  cursor: pointer;
  border: 2px solid #dee2e6;
  transition: all 0.2s ease;
}

.rainbow-swatch:hover {
  transform: scale(1.1);
}

.hidden-color-input {
  display: none;
}

.color-picker-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background-color: transparent;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;
}

.action-btn:hover:not(:disabled) {
  background-color: #e9ecef;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn ion-icon {
  font-size: 20px;
}

ion-popover {
  --width: auto;
  --max-width: 90vw;
}

.color-popover-content {
  padding: 1rem;
  width: fit-content;
  max-width: 90vw;
}

.color-popover-content h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  width: 100%;
  min-width: 288px;
}

.color-option {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid #dee2e6;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-option.active {
  border-color: #4a9eff;
  border-width: 3px;
}

.color-option ion-icon {
  font-size: 24px;
  color: #fff;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

/* Hide native scrollbar on ion-content */
.drawing-content::part(scroll) {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.drawing-content::part(scroll)::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.content-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.drawing-content {
  width: 100%;
  height: 100%;
}

/* Made custom scrollbar more visible and larger for iPad */
.custom-scrollbar-overlay {
  position: absolute;
  top: 0;
  right: 0; /* Flush against right edge */
  bottom: 0;
  width: 50px;
  pointer-events: none;
  z-index: 1000;
  padding: 10px 0 10px 10px; /* No padding on right, only on left/top/bottom */
}

.scrollbar-track-vertical {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 25px;
  position: relative;
  pointer-events: auto;
}

.scrollbar-thumb-vertical {
  width: 100%;
  min-height: 60px;
  background: rgba(74, 158, 255, 0.9);
  border-radius: 25px;
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
  transition: background 0.2s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.scrollbar-thumb-vertical:active {
  cursor: grabbing;
  background: rgba(74, 158, 255, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.scrollbar-thumb-vertical:hover {
  background: rgba(74, 158, 255, 0.95);
}
</style>
