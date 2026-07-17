<script setup lang="ts">
import { Accessibility, AudioLines, Gauge, Globe2, Network, RotateCcw, Save, SlidersHorizontal, Volume2 } from 'lucide-vue-next';

const { settings, save, reset } = useSettings();
const { locale, setLocale } = useI18n();
const audio = useAudioManager();
const toast = useToast();
const confirmReset = ref(false);

const persist = () => { save(); audio.syncVolume(); };
const saveAll = () => {
  persist();
  void audio.playSfx('success', 'interface');
  toast.push({ tone: 'success', title: '设置已保存' });
};
const resetAll = () => {
  reset();
  confirmReset.value = false;
  toast.push({ tone: 'info', title: '已恢复默认设置' });
};
</script>

<template>
  <div class="page page-narrow settings-page">
    <header class="page-heading">
      <div><span class="eyebrow">系统配置</span><h1>{{ $t('settings.title') }}</h1><p>界面、演出、声音与在线身份均保存在本机。</p></div>
      <div class="button-row"><GameButton variant="ghost" @click="confirmReset=true"><RotateCcw :size="16" /> 恢复默认</GameButton><GameButton variant="primary" @click="saveAll"><Save :size="16" /> {{ $t('common.save') }}</GameButton></div>
    </header>

    <div class="settings-layout">
      <GamePanel title="界面与辅助" eyebrow="Display">
        <div class="setting-line"><div><Globe2 :size="18" /><span><strong>{{ $t('settings.locale') }}</strong><small>LANGUAGE</small></span></div><select class="select compact-control" :value="locale" aria-label="界面语言" @change="setLocale(($event.target as HTMLSelectElement).value as 'zh-CN' | 'en')"><option value="zh-CN">简体中文</option><option value="en">English</option></select></div>
        <div class="setting-line"><div><Accessibility :size="18" /><span><strong>{{ $t('settings.reducedMotion') }}</strong><small>REDUCED MOTION</small></span></div><button class="toggle" :class="{ on: settings.reducedMotion }" type="button" role="switch" :aria-checked="settings.reducedMotion" aria-label="减少动画" @click="settings.reducedMotion=!settings.reducedMotion;persist()" /></div>
        <div class="setting-line"><div><Gauge :size="18" /><span><strong>{{ $t('settings.highContrast') }}</strong><small>HIGH CONTRAST</small></span></div><button class="toggle" :class="{ on: settings.highContrast }" type="button" role="switch" :aria-checked="settings.highContrast" aria-label="高对比度" @click="settings.highContrast=!settings.highContrast;persist()" /></div>
      </GamePanel>

      <GamePanel title="战场演出" eyebrow="Presentation">
        <label class="setting-stack"><span><SlidersHorizontal :size="18" /><strong>动画速度</strong></span><span class="segmented-control"><button v-for="option in [{value:'normal',label:'正常'},{value:'fast',label:'快速'},{value:'instant',label:'极快'}]" :key="option.value" type="button" :class="{active:settings.animationSpeed===option.value}" @click="settings.animationSpeed=option.value as typeof settings.animationSpeed;persist()">{{ option.label }}</button></span></label>
        <label class="setting-stack"><span><Gauge :size="18" /><strong>特效质量</strong></span><span class="segmented-control"><button v-for="option in [{value:'high',label:'高'},{value:'balanced',label:'均衡'},{value:'low',label:'低'}]" :key="option.value" type="button" :class="{active:settings.effectsQuality===option.value}" @click="settings.effectsQuality=option.value as typeof settings.effectsQuality;persist()">{{ option.label }}</button></span></label>
      </GamePanel>

      <GamePanel title="音乐与音效" eyebrow="Audio" class="audio-panel">
        <div class="setting-line"><div><AudioLines :size="18" /><span><strong>启用声音</strong><small>AUDIO OUTPUT</small></span></div><button class="toggle" :class="{ on: settings.audio.enabled }" type="button" role="switch" :aria-checked="settings.audio.enabled" aria-label="启用声音" @click="settings.audio.enabled=!settings.audio.enabled;persist()" /></div>
        <div class="volume-stack" :class="{disabled:!settings.audio.enabled}">
          <VolumeControl v-model="settings.audio.masterVolume" label="总音量" :disabled="!settings.audio.enabled" @change="persist" />
          <VolumeControl v-model="settings.audio.musicVolume" label="音乐" :disabled="!settings.audio.enabled" @change="persist" />
          <VolumeControl v-model="settings.audio.sfxVolume" label="战斗音效" :disabled="!settings.audio.enabled" @change="persist" />
          <VolumeControl v-model="settings.audio.interfaceVolume" label="界面音效" :disabled="!settings.audio.enabled" @change="persist" />
        </div>
        <div class="setting-line"><div><Volume2 :size="18" /><span><strong>失焦时静音</strong><small>BACKGROUND MUTE</small></span></div><button class="toggle" :class="{ on: settings.audio.muteWhenUnfocused }" type="button" role="switch" :aria-checked="settings.audio.muteWhenUnfocused" aria-label="失焦时静音" @click="settings.audio.muteWhenUnfocused=!settings.audio.muteWhenUnfocused;persist()" /></div>
      </GamePanel>

      <GamePanel title="在线身份" eyebrow="Network">
        <div class="network-fields"><label class="field"><span class="field-label"><Network :size="14" /> {{ $t('settings.server') }}</span><input v-model.trim="settings.serverUrl" class="input" inputmode="url" autocomplete="url" @change="persist"></label><label class="field"><span class="field-label">玩家昵称</span><input v-model.trim="settings.playerName" class="input" maxlength="24" autocomplete="nickname" @change="persist"></label></div>
      </GamePanel>
    </div>
    <ConfirmDialog :open="confirmReset" title="恢复默认设置" message="界面、演出、声音和在线身份设置都会恢复默认值。" confirm-label="恢复" @cancel="confirmReset=false" @confirm="resetAll" />
  </div>
</template>

<style scoped>
.settings-layout{display:grid;grid-template-columns:1fr 1fr;gap:16px}.audio-panel{grid-row:span 2}.setting-line{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border-subtle)}.setting-line:last-child{border-bottom:0}.setting-line>div,.setting-stack>span:first-child{display:flex;align-items:center;gap:11px}.setting-line svg,.setting-stack svg{color:var(--color-copper)}.setting-line span{display:grid}.setting-line small{margin-top:2px;color:var(--color-text-muted);font:8px var(--font-numeric)}.compact-control{width:190px}.setting-stack{display:grid;gap:12px;padding:13px 0;border-bottom:1px solid var(--border-subtle)}.segmented-control{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border-subtle)}.segmented-control button{min-height:38px;border:0;border-right:1px solid var(--border-subtle);background:#0f1513;color:var(--color-text-muted);cursor:pointer}.segmented-control button:last-child{border-right:0}.segmented-control button.active{background:var(--color-surface-tertiary);color:var(--color-gold)}.volume-stack{padding:8px 0;border-bottom:1px solid var(--border-subtle)}.volume-stack.disabled{opacity:.52}.network-fields{display:grid;gap:16px}.field-label{display:flex;align-items:center;gap:6px}@media(max-width:780px){.settings-layout{grid-template-columns:1fr}.audio-panel{grid-row:auto}.page-heading .button-row{width:100%}.page-heading .game-button{flex:1}}@media(max-width:440px){.setting-line{align-items:flex-start;padding:12px 0}.compact-control{width:150px}}
</style>
