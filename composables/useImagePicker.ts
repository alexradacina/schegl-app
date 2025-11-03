import { Camera, CameraResultType, CameraSource } from "@capacitor/camera"
import { Capacitor } from "@capacitor/core"
import { StatusBar, Style } from "@capacitor/status-bar"
import { actionSheetController } from "@ionic/vue"

export const useImagePicker = () => {
    const isNative = Capacitor.isNativePlatform()

    /**
     * Pick an image from camera or photo library
     * On native: Shows action sheet to choose source
     * On web: Uses file input
     */
    const pickImage = async (): Promise<string | null> => {
        console.log("[v0] pickImage called, isNative:", isNative)

        if (isNative) {
            return await pickImageNative()
        } else {
            return await pickImageWeb()
        }
    }

    /**
     * Native image picker using Capacitor Camera plugin
     */
    const pickImageNative = async (): Promise<string | null> => {
        try {
            console.log("[v0] Showing action sheet for image source selection")

            let imageData: string | null = null

            // Show action sheet to choose source
            const actionSheet = await actionSheetController.create({
                header: "Add Image",
                buttons: [
                    {
                        text: "Take Photo",
                        icon: "camera-outline",
                        handler: async () => {
                            console.log("[v0] Take Photo button clicked")
                            imageData = await captureImage(CameraSource.Camera)
                            console.log("[v0] Camera image captured, data length:", imageData?.length || 0)
                        },
                    },
                    {
                        text: "Choose from Library",
                        icon: "images-outline",
                        handler: async () => {
                            console.log("[v0] Choose from Library button clicked")
                            imageData = await captureImage(CameraSource.Photos)
                            console.log("[v0] Library image captured, data length:", imageData?.length || 0)
                        },
                    },
                    {
                        text: "Cancel",
                        icon: "close-outline",
                        role: "cancel",
                    },
                ],
            })

            await actionSheet.present()
            await actionSheet.onDidDismiss()

            console.log("[v0] Action sheet dismissed, imageData:", imageData ? "exists" : "null")

            return imageData
        } catch (error) {
            console.error("[v0] Error picking image (native):", error)
            return null
        }
    }

    /**
     * Capture image from camera or photo library
     */
    const captureImage = async (source: CameraSource): Promise<string | null> => {
        try {
            console.log("[v0] Calling Camera.getPhoto with source:", source)

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source,
                presentationStyle: "fullscreen",
            })

            console.log("[v0] Camera.getPhoto returned, dataUrl exists:", !!image.dataUrl)

            if (isNative && Capacitor.getPlatform() === "ios") {
                try {
                    await StatusBar.setOverlaysWebView({ overlay: false })
                    await StatusBar.setStyle({ style: Style.Dark }) // Dark style = white text on dark background
                    await StatusBar.show()
                    console.log("[v0] Status bar fixed after image capture")
                } catch (error) {
                    console.error("[v0] Error fixing status bar:", error)
                }
            }

            return image.dataUrl || null
        } catch (error) {
            console.error("[v0] Error capturing image:", error)

            if (isNative && Capacitor.getPlatform() === "ios") {
                try {
                    await StatusBar.setOverlaysWebView({ overlay: false })
                    await StatusBar.setStyle({ style: Style.Dark }) // Dark style = white text on dark background
                    await StatusBar.show()
                } catch (e) {
                    console.error("[v0] Error fixing status bar on error:", e)
                }
            }

            return null
        }
    }

    /**
     * Web image picker using file input
     */
    const pickImageWeb = async (): Promise<string | null> => {
        console.log("[v0] Using web file input for image selection")

        return new Promise((resolve) => {
            const input = document.createElement("input")
            input.type = "file"
            input.accept = "image/*"

            input.style.position = "fixed"
            input.style.left = "0"
            input.style.top = "0"
            input.style.opacity = "0.001"
            document.body.appendChild(input)

            input.onchange = async (e: Event) => {
                const target = e.target as HTMLInputElement
                const file = target.files?.[0]

                if (file) {
                    console.log("[v0] File selected:", file.name, file.size)

                    const reader = new FileReader()
                    reader.onload = (f) => {
                        const data = f.target?.result as string
                        console.log("[v0] File read successfully, data length:", data?.length || 0)
                        document.body.removeChild(input)
                        resolve(data)
                    }
                    reader.onerror = () => {
                        console.error("[v0] Error reading file")
                        document.body.removeChild(input)
                        resolve(null)
                    }
                    reader.readAsDataURL(file)
                } else {
                    console.log("[v0] No file selected")
                    document.body.removeChild(input)
                    resolve(null)
                }
            }

            input.oncancel = () => {
                console.log("[v0] File input cancelled")
                document.body.removeChild(input)
                resolve(null)
            }

            input.click()
        })
    }

    return {
        pickImage,
    }
}
