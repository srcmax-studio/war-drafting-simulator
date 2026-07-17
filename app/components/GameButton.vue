<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next';

withDefaults(defineProps<{
  to?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}>(), { variant: 'secondary', size: 'medium', type: 'button' });
</script>

<template>
  <NuxtLink v-if="to && !disabled" :to="to" :prefetch="false" class="game-button" :class="[`is-${variant}`, `is-${size}`]"><slot /></NuxtLink>
  <button v-else class="game-button" :class="[`is-${variant}`, `is-${size}`]" :type="type" :disabled="disabled || loading">
    <LoaderCircle v-if="loading" class="spin" :size="17" aria-hidden="true" />
    <slot />
  </button>
</template>
