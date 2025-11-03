import { defineStore } from "pinia";
import { ref } from "vue";
import { templatesAPI } from "@/services/api";
export const useTemplatesStore = defineStore("templates", () => {
    const templates = ref([]);
    const currentTemplate = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const fetchTemplates = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await templatesAPI.getAll();
            if (response.data.success) {
                templates.value = response.data.data.templates || [];
            }
            else {
                error.value = response.data.message || "Failed to fetch templates";
                templates.value = [];
            }
        }
        catch (err) {
            error.value = err.response?.data?.message || "Failed to fetch templates";
            templates.value = [];
        }
        finally {
            isLoading.value = false;
        }
    };
    const fetchTemplateById = async (id) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await templatesAPI.getById(id);
            if (response.data.success) {
                currentTemplate.value = response.data.data.template;
                return response.data.data.template;
            }
            else {
                error.value = response.data.message || "Failed to fetch template";
                return null;
            }
        }
        catch (err) {
            error.value = err.response?.data?.message || "Failed to fetch template";
            return null;
        }
        finally {
            isLoading.value = false;
        }
    };
    return {
        templates,
        currentTemplate,
        isLoading,
        error,
        fetchTemplates,
        fetchTemplateById,
    };
});
//# sourceMappingURL=templates.js.map
