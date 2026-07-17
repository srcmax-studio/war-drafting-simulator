<script setup lang="ts">
import { BookOpen, GalleryVerticalEnd, History, House, LibraryBig, Menu, Settings, Swords, X } from 'lucide-vue-next';

const route = useRoute();
const mobileOpen = ref(false);
const nav = [
  { to: '/', label: 'nav.home', icon: House },
  { to: '/play', label: 'nav.play', icon: Swords },
  { to: '/deck-builder', label: 'nav.decks', icon: GalleryVerticalEnd },
  { to: '/collection', label: 'nav.cards', icon: LibraryBig },
  { to: '/fronts', label: 'nav.fronts', icon: BookOpen },
  { to: '/history', label: 'nav.history', icon: History },
  { to: '/settings', label: 'nav.settings', icon: Settings }
];
watch(() => route.fullPath, () => { mobileOpen.value = false; });
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink to="/" class="brand-lockup" aria-label="万世战线首页">
        <span class="brand-mark">AF</span>
        <span><strong>万世战线</strong><small>AEONFRONT</small></span>
      </NuxtLink>
      <nav class="primary-nav" :class="{ open: mobileOpen }" :aria-label="$t('nav.main')">
        <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" :class="{ active: route.path === item.to }">
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ $t(item.label) }}</span>
        </NuxtLink>
      </nav>
      <button class="icon-button mobile-menu" type="button" :aria-label="$t('nav.menu')" @click="mobileOpen = !mobileOpen">
        <X v-if="mobileOpen" :size="22" />
        <Menu v-else :size="22" />
      </button>
    </header>
    <main class="app-main"><NuxtPage /></main>
  </div>
</template>
