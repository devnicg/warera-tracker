<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-8">
          <div class="has-text-centered mb-5">
            <h1 class="title is-1">WarEra Citizenship Tracker</h1>
            <p class="subtitle is-4">
              Track and visualize citizenship changes across nations in WarEra.
            </p>
          </div>

          <div class="box">
            <h3 class="title is-4">Features</h3>
            <div class="content">
              <ul>
                <li>✓ Select any nation to view its citizens</li>
                <li>✓ Filter active players (played within last 10 days)</li>
                <li>✓ View citizenship change history for each player</li>
                <li>✓ Visualize citizenship changes with diagrams</li>
              </ul>
            </div>
            <div class="has-text-centered mt-5">
              <RouterLink to="/tracker" class="button is-primary is-large">
                Start Tracking
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
