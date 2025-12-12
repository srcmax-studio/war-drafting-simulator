import Toast, { useToast as toastInstance } from "vue-toastification";
import "vue-toastification/dist/index.css";

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(Toast, {
        position: "bottom-center",
        timeout: 3000,
        closeOnClick: true,
        pauseOnFocusLoss: true,
        pauseOnHover: true,
        draggable: false,
        draggablePercent: 0.53,
        showCloseButtonOnHover: true,
        hideProgressBar: true,
        closeButton: "button",
        icon: true,
        rtl: false,
        transition: "Vue-Toastification__fade",
        maxToasts: 5,
        newestOnTop: true
    });

    nuxtApp.provide("toast", toastInstance());
});

export function showError(message) {
    const { $toast } = useNuxtApp();
    $toast.error(message);
}

export function showSuccess(message) {
    const { $toast } = useNuxtApp();
    $toast.success(message);
}

export function showInfo(message) {
    const { $toast } = useNuxtApp();
    $toast.info(message);
}
