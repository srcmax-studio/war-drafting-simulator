import Toast, { useToast } from "vue-toastification";
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
});

export function showError(message) {
    const toast = useToast();
    toast.error(message ?? '发生错误');
}

export function showSuccess(message) {
    const toast = useToast();
    toast.success(message ?? '操作完成');
}

export function showInfo(message) {
    const toast = useToast();
    toast.info(message);
}
