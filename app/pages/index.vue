<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const showModal = ref(false);

function goToServersList() {
  router.push("/servers");
}

function goToGitHubRepo() {
  window.open("https://github.com/srcmax-studio/war-drafting-simulator-server", '_blank').focus();
}
</script>

<template>
  <main class="container">
    <div class="header">
      <div class="text-xl text-bold">战争轮抽模拟器</div>
      <div class="subtitle">war-drafting-simulator</div>
    </div>

    <div class="buttons">
      <button class="btn" @click="goToServersList">加入服务器</button>
      <button class="btn btn-primary" @click="showModal = true">创建服务器</button>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h2>创建服务器</h2>
        <p>
          本项目开放源代码，并欢迎玩家创建自己的服务器。
        </p>
        <p>
          若想创建服务器，请前往项目的 GitHub 仓库下载源代码并部署。
        </p>
        <p>
          若您的服务器对互联网（公网）开放，则将会被自动发布至本网站的公共服务器列表。您可以在服务器设定文件中通过 "publish-server": false 禁用此功能。
        </p>
        <p>
          此外，您还可以通过 "password" 选项为服务器设定密码。
        </p>
        <div class="buttons">
          <button class="btn github-link" @click="goToGitHubRepo">
            GitHub 仓库
          </button>
          <button class="btn btn-close" @click="showModal = false">关闭</button>
        </div>
      </div>
    </div>
  </main>

  <footer>
    Made by <a href="https://srcmax.com" target="_blank">SrcMax Studio</a>
  </footer>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: .5rem;
}

.header .subtitle {
  font-size: 1rem;
  color: #cccccc;
  margin-bottom: 2rem;
}

.modal h2 {
  margin-bottom: 1rem;
}

.modal p {
  margin-bottom: 1.5rem;
}

.github-link {
  display: inline-block;
  background-color: #24292f;
  color: #fff;
  text-decoration: none;
}

.github-link:hover {
  background-color: #444c56;
}

.btn-close {
  background-color: #eee;
  border: 1px solid #ccc;
}

footer {
  text-align: center;
  margin-top: 3rem;
  padding: 1rem;
  font-size: 0.9rem;
  color: #666;
}

footer a {
  color: #333;
  text-decoration: underline;
}
</style>
