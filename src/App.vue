<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div>
    <nav class="navbar is-dark" role="navigation">
      <div class="container is-fluid">
        <div class="navbar-brand">
          <RouterLink to="/" class="navbar-item">
            <strong>WarEra Tracker</strong>
          </RouterLink>
        </div>

        <div class="navbar-menu is-active">
          <div class="navbar-end">
            <RouterLink to="/" class="navbar-item">Home</RouterLink>
            <RouterLink to="/tracker" class="navbar-item">Tracker</RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.navbar-item.router-link-active {
  background-color: rgba(0, 0, 0, 0.2);
  font-weight: bold;
}
</style>
