<template>
  <div class="coin-container" :class="{'center-floating': floatInCenter}">
    <div
        class="coin"
        :class="{ 'heads': finalResult === 'heads', 'tails': finalResult === 'tails' }"
        @animationend="handleAnimationEnd"
    >
      <div class="side heads">
        <div class="inner-circle">
          <span class="label">先手</span>
        </div>
      </div>
      <div class="side tails">
        <div class="inner-circle">
          <span class="label">后手</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Coinflip',
  props: {
    finalResult: {
      type: String,
      required: true,
      validator: (value) => ['heads', 'tails'].includes(value)
    },
    floatInCenter: {
      type: Boolean,
      default: false
    }
  },
  mounted() {
    this.$emit('flip-start');
  },
  methods: {
    handleAnimationEnd() {
      this.$emit('flip-end', this.finalResult);
    }
  }
};
</script>

<style scoped>
.coin-container {
  --coin-size: 150px;
  --gold-primary: #fbc02d;
  --gold-dark: #f9a825;
  --gold-light: #fff59d;
  --silver-primary: #bdbdbd;
  --silver-dark: #757575;
  --silver-light: #eeeeee;

  width: var(--coin-size);
  height: var(--coin-size);
  perspective: 1200px;
}

.center-floating {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.coin {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
}

.side {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.5), 0 5px 15px rgba(0,0,0,0.3);
  border: 4px solid rgba(0, 0, 0, 0.1);
}

.inner-circle {
  width: 85%;
  height: 85%;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.label {
  font-weight: 900;
  font-size: 28px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  color: white;
  position: relative;
  z-index: 5;
}

.side.heads {
  background: radial-gradient(circle at 30% 30%, var(--gold-light), var(--gold-primary) 70%, var(--gold-dark));
  transform: rotateY(0deg);
}

.side.tails {
  background: radial-gradient(circle at 30% 30%, var(--silver-light), var(--silver-primary) 70%, var(--silver-dark));
  transform: rotateY(180deg);
}

.coin.heads {
  animation: flip-heads 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.coin.tails {
  animation: flip-tails 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes flip-heads {
  0% { transform: scale(1) rotateY(0); }
  25% { transform: scale(1.4) rotateY(900deg); }
  100% { transform: scale(1) rotateY(1800deg); }
}

@keyframes flip-tails {
  0% { transform: scale(1) rotateY(0); }
  25% { transform: scale(1.4) rotateY(990deg); }
  100% { transform: scale(1) rotateY(1980deg); }
}
</style>
