<script setup lang="ts">
import { ArrowRight, BookOpen, EyeOff, Flag, Layers3, LockKeyhole, Shield, Shuffle, Skull, Swords, Timer, Trophy } from 'lucide-vue-next';

const active = ref<'basics'|'turn'|'advanced'>('basics');
const turns = [
  { turn: 1, orders: 1, reveal: '左翼战线', stake: '1' },
  { turn: 2, orders: 2, reveal: '中军战线', stake: '1' },
  { turn: 3, orders: 3, reveal: '右翼战线', stake: '1' },
  { turn: 4, orders: 4, reveal: '全线公开', stake: '1 或举旗' },
  { turn: 5, orders: 5, reveal: '全线公开', stake: '当前战功' },
  { turn: 6, orders: 6, reveal: '终局', stake: '自动翻倍' }
];
</script>

<template>
  <div class="page page-narrow rules-page">
    <header class="page-heading"><div><span class="eyebrow">作战条令</span><h1>游戏规则</h1><p>十二张角色卡、六个回合、三条战线。终局控制至少两条战线者获胜。</p></div><GameButton to="/play" variant="primary"><Swords :size="16" /> 进入对战 <ArrowRight :size="14" /></GameButton></header>
    <nav class="rules-tabs" aria-label="规则章节"><button :class="{active:active==='basics'}" @click="active='basics'">基础规则</button><button :class="{active:active==='turn'}" @click="active='turn'">回合结算</button><button :class="{active:active==='advanced'}" @click="active='advanced'">战线与隐藏信息</button></nav>

    <section v-if="active==='basics'" class="rule-chapter">
      <div class="rule-lead"><Layers3 :size="30" /><div><span class="eyebrow">Deck</span><h2>牌组与抽牌</h2><p>牌组固定十二张，同名角色仅一张。初始抽三张，每回合开始抽一张；牌库耗尽后停止抽牌。</p></div></div>
      <dl class="rule-facts"><div><dt>牌组</dt><dd>12</dd><dd class="fact-note">不同角色</dd></div><div><dt>回合</dt><dd>6</dd><dd class="fact-note">同时规划</dd></div><div><dt>战线</dt><dd>3</dd><dd class="fact-note">依次揭示</dd></div><div><dt>默认容量</dt><dd>4</dd><dd class="fact-note">每方每线</dd></div></dl>
      <div class="rules-list"><article><Trophy :size="20" /><div><h3>胜利条件</h3><p>终局先比较控制的战线数量；若各控制一条，则比较三线总战力；仍相同则判为平局。</p></div></article><article><Shield :size="20" /><div><h3>控制权</h3><p>单条战线中战力更高的一方取得控制权。相同战力时该线无人控制。</p></div></article><article><Flag :size="20" /><div><h3>战功</h3><p>初始战功为 1。举旗会让战功在下一回合翻倍，第六回合开始时自动翻倍。</p></div></article><article><Skull :size="20" /><div><h3>撤军</h3><p>任意规划阶段可撤军并立即结束对局；待生效战功不会计入撤军结算。</p></div></article></div>
    </section>

    <section v-else-if="active==='turn'" class="rule-chapter">
      <div class="rule-lead"><Timer :size="30" /><div><span class="eyebrow">Turn structure</span><h2>六回合节奏</h2><p>每回合军令等于回合数，未使用军令不会保留。双方锁定后由权威规则引擎统一结算。</p></div></div>
      <div class="turn-table"><header><span>回合</span><span>军令</span><span>战场情报</span><span>战功</span></header><div v-for="row in turns" :key="row.turn"><strong>{{ row.turn }}</strong><b>{{ row.orders }}</b><span>{{ row.reveal }}</span><span>{{ row.stake }}</span></div></div>
      <ol class="resolution-flow"><li><span>01</span><div><strong>回合开始</strong><small>刷新军令、抽牌、执行回合开始效果。</small></div></li><li><span>02</span><div><strong>同步规划</strong><small>双方部署、调整顺序、举旗或撤军。</small></div></li><li><span>03</span><div><strong>双方锁定</strong><small>锁定后计划不可再修改。</small></div></li><li><span>04</span><div><strong>按制势揭示</strong><small>制势方角色先揭示，同方按部署顺序处理。</small></div></li><li><span>05</span><div><strong>结算与控制</strong><small>技能、移动、阵亡、复归、战线效果依序完成。</small></div></li><li><span>06</span><div><strong>回合结束</strong><small>更新三线控制、制势权、战功与终局条件。</small></div></li></ol>
    </section>

    <section v-else class="rule-chapter">
      <div class="rule-lead"><BookOpen :size="30" /><div><span class="eyebrow">Battlefield</span><h2>战线与隐藏信息</h2><p>战线改变费用、容量、战力、揭示顺序、移动、阵亡与资源循环，但不会改变 1v1 基础胜负结构。</p></div></div>
      <div class="rules-list"><article><LockKeyhole :size="20" /><div><h3>未揭示战线</h3><p>名称、场景和规则均保持隐藏。玩家可以向未知战线部署伏兵，战线通常在前三回合依次揭示。</p></div></article><article><EyeOff :size="20" /><div><h3>私人信息</h3><p>对手手牌、牌库顺序、未揭示角色身份和重连凭证不可见。公开事件不会包含隐藏牌组数据。</p></div></article><article><Swords :size="20" /><div><h3>制势权</h3><p>控制更多战线者取得制势；若数量相同则比较总战力，再相同则保留上一回合制势。</p></div></article><article><Shuffle :size="20" /><div><h3>调遣与容量</h3><p>角色移动前必须满足目标战线容量；封锁和禁止移动效果优先于一般调遣。</p></div></article></div>
      <aside class="privacy-note"><LockKeyhole :size="18" /><span><strong>权威视图边界</strong><small>客户端只接收当前玩家可见的裁剪状态，完整规则状态保留在本地练习引擎或在线服务端。</small></span></aside>
    </section>
  </div>
</template>

<style scoped>
.rules-tabs{display:flex;overflow:auto;border:solid var(--border-subtle);border-width:1px 0}.rules-tabs button{min-width:150px;min-height:50px;padding:0 18px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--color-text-muted);cursor:pointer}.rules-tabs button.active{border-bottom-color:var(--color-copper);color:var(--color-gold)}.rule-chapter{padding-top:28px}.rule-lead{display:grid;grid-template-columns:54px 1fr;gap:16px;align-items:start;padding-bottom:24px;border-bottom:1px solid var(--border-subtle)}.rule-lead>svg{color:var(--color-copper)}.rule-lead h2{margin:3px 0 5px;font-family:var(--font-display);font-size:24px}.rule-lead p{margin:0;color:var(--color-text-secondary);line-height:1.75}.rule-facts{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border-left:1px solid var(--border-subtle)}.rule-facts div{display:grid;padding:18px;border-right:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle)}.rule-facts dt{color:var(--color-text-muted);font-size:9px}.rule-facts dd{margin:2px 0;font:700 28px var(--font-numeric);color:var(--color-gold)}.rule-facts small{color:var(--color-text-muted);font-size:9px}.rules-list{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}.rules-list article{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:22px 0;border-bottom:1px solid var(--border-subtle)}.rules-list svg{color:var(--color-copper)}.rules-list h3{margin:0 0 6px;font-size:15px}.rules-list p{margin:0;color:var(--color-text-muted);line-height:1.75}.turn-table{border-top:1px solid var(--border-subtle)}.turn-table header,.turn-table>div{min-height:52px;display:grid;grid-template-columns:80px 90px 1fr 150px;align-items:center;border-bottom:1px solid var(--border-subtle)}.turn-table header{color:var(--color-text-muted);font-size:9px}.turn-table strong,.turn-table b{font:700 18px var(--font-numeric)}.turn-table b{color:var(--color-gold)}.resolution-flow{display:grid;grid-template-columns:1fr 1fr;margin:28px 0 0;padding:0;border-top:1px solid var(--border-subtle);list-style:none}.resolution-flow li{min-height:82px;display:grid;grid-template-columns:44px 1fr;align-items:center;gap:10px;border-bottom:1px solid var(--border-subtle)}.resolution-flow li:nth-child(odd){border-right:1px solid var(--border-subtle)}.resolution-flow li>span{font:700 18px var(--font-numeric);color:var(--color-copper)}.resolution-flow li div{display:grid}.resolution-flow small{margin-top:3px;color:var(--color-text-muted)}.privacy-note{display:flex;align-items:center;gap:12px;margin-top:24px;padding:15px;border-left:3px solid var(--color-info);background:var(--color-surface-primary)}.privacy-note>span{display:grid}.privacy-note small{color:var(--color-text-muted)}@media(max-width:650px){.page-heading>.game-button{width:100%}.rule-facts{grid-template-columns:1fr 1fr}.rules-list{grid-template-columns:1fr}.turn-table header,.turn-table>div{grid-template-columns:54px 58px 1fr}.turn-table header span:last-child,.turn-table>div span:last-child{display:none}.resolution-flow{grid-template-columns:1fr}.resolution-flow li:nth-child(odd){border-right:0}.rule-lead{grid-template-columns:40px 1fr}}
.rule-facts .fact-note{margin:0;color:var(--color-text-muted);font:9px var(--font-body)}
</style>
