<script setup lang="ts">
import { BookOpen, GalleryVerticalEnd, History, House, LibraryBig, Menu, Settings, Swords, UsersRound, Volume2, VolumeX, X } from 'lucide-vue-next';

const route = useRoute();
const mobileOpen = ref(false);
const { settings, save } = useSettings();
const audio = useAudioManager();
const nav = [
  { to: '/', label: '总览', icon: House },
  { to: '/play', label: '对战', icon: Swords },
  { to: '/lobby', label: '大厅', icon: UsersRound },
  { to: '/deck-builder', label: '牌组', icon: GalleryVerticalEnd },
  { to: '/collection', label: '卡牌', icon: LibraryBig },
  { to: '/fronts', label: '战线', icon: BookOpen },
  { to: '/history', label: '战史', icon: History },
  { to: '/settings', label: '设置', icon: Settings }
];

watch(() => route.fullPath, () => { mobileOpen.value = false; });
const toggleMute = () => { settings.value.audio.enabled = !settings.value.audio.enabled; save(); };
const playInterfaceCue = (event: MouseEvent) => {
  const control = (event.target as HTMLElement | null)?.closest('button, a');
  if (!control || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;
  void audio.playSfx(control.classList.contains('primary') || control.classList.contains('is-primary') ? 'button-primary' : 'button', 'interface');
};
onMounted(() => document.addEventListener('click', playInterfaceCue));
onBeforeUnmount(() => document.removeEventListener('click', playInterfaceCue));
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink to="/" :prefetch="false" class="brand-lockup" aria-label="万世战线首页">
        <img src="/aeonfront-mark.svg" alt="" class="brand-mark">
        <span><strong>万世战线</strong><small>AEONFRONT</small></span>
      </NuxtLink>
      <nav class="primary-nav" :class="{ open: mobileOpen }" aria-label="主要导航">
        <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" :prefetch="false" :class="{ active: route.path === item.to || item.to !== '/' && route.path.startsWith(`${item.to}/`) }">
          <component :is="item.icon" :size="17" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="header-tools">
        <IconButton :label="settings.audio.enabled ? '静音' : '开启声音'" @click="toggleMute">
          <Volume2 v-if="settings.audio.enabled" :size="18" />
          <VolumeX v-else :size="18" />
        </IconButton>
        <IconButton class="mobile-menu" :label="mobileOpen ? '关闭导航' : '打开导航'" @click="mobileOpen = !mobileOpen">
          <X v-if="mobileOpen" :size="21" />
          <Menu v-else :size="21" />
        </IconButton>
      </div>
    </header>
    <main class="app-main"><slot /></main>
    <ToastHost />
  </div>
</template>
