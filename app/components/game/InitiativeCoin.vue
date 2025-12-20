<template>
  <div class="initiative-tag">
    <span class="tag-text">先手</span>
  </div>
</template>

<style scoped>
.initiative-tag {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 20px;
  padding: 2px 4px;
  animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tag-text {
  font-size: 0.75rem;
  color: #d4af37;
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes coin-flip-subtle {
  0%, 100% { transform: rotateY(0deg); }
  50% { transform: rotateY(180deg); }
}
</style>
