<template>
  <div class="ping-monitor" v-if="ping !== undefined && ping >= 0">
    <div class="signal-icon" :style="{ '--signal-color': statusColor }">
      <div v-for="i in 4" :key="i"
           class="bar"
           :class="{ 'inactive': i > activeBars }">
      </div>
    </div>

    <span class="ping-value" style="color: gray">
      {{ ping }}<small>ms</small>
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  ping: {
    type: Number,
    required: true
  }
});

const smoothedPing = ref(props.ping);

watch(() => props.ping, (newVal) => {
  smoothedPing.value = (smoothedPing.value * 0.8) + (newVal * 0.2);
});

const activeBars = computed(() => {
  if (smoothedPing.value < 35) return 4;
  if (smoothedPing.value < 60) return 3;
  if (smoothedPing.value < 80) return 2;
  return 1;
});

const statusColor = computed(() => {
  const p = smoothedPing.value;
  if (p < 50) return '#40ff70';
  if (p < 80) return '#ffcc00';
  return '#ff4d4d';
});
</script>

<style scoped>
.ping-monitor {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: 10px;
  user-select: none;
}

.signal-icon {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.bar {
  width: 3px;
  background-color: var(--signal-color);
  border-radius: 1px;
  transition: background-color 0.3s ease, height 0.3s ease;
}

.bar:nth-child(1) { height: 30%; }
.bar:nth-child(2) { height: 55%; }
.bar:nth-child(3) { height: 80%; }
.bar:nth-child(4) { height: 100%; }

.bar.inactive {
  background-color: #555 !important;
  opacity: 0.3;
}

.ping-value {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  font-weight: 800;
  transition: color 0.3s ease;
}

.ping-value small {
  font-size: 0.7em;
  margin-left: 1px;
  opacity: 0.8;
}
</style>
