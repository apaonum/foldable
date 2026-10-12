<script setup lang="ts">
import { arrangement, displace, useFoldable, view } from '@foldablejs/vue';

// SERVER_STATE during SSR and hydration, then live once mounted.
const state = useFoldable();
const expanded = ref(false);
</script>

<template>
  <main>
    <h1>foldable + Nuxt</h1>
    <p>
      Posture <strong>{{ state.posture }}</strong
      >, Size Class <strong>{{ state.sizeClass }}</strong
      >, source <strong>{{ state.source }}</strong
      >, {{ state.regions.length }} Region(s).
    </p>

    <h2 id="split">Split</h2>
    <section class="frame" v-bind="arrangement({ style: 'split' })">
      <div class="view-content" v-bind="view('primary')">Primary (list)</div>
      <div class="view-content" v-bind="view('secondary')">Secondary (detail)</div>
    </section>

    <h2 id="split-vertical">Split, vertical axis only</h2>
    <section class="frame" v-bind="arrangement({ style: 'split', axes: 'vertical' })">
      <div class="view-content" v-bind="view('primary')">Primary</div>
      <div class="view-content" v-bind="view('secondary')">
        Secondary (hidden if vertical isn't allowed)
      </div>
    </section>

    <h2 id="overlay">Overlay</h2>
    <!-- Overlay DOM order: secondary first, then primary. -->
    <section
      class="frame"
      v-bind="arrangement({ style: 'overlay', overlayState: expanded ? 'expanded' : 'collapsed' })"
    >
      <div class="view-content" v-bind="view('secondary')">Secondary (map)</div>
      <div class="view-content" v-bind="view('primary')">
        Primary (controls)
        <button type="button" @click="expanded = !expanded">
          {{ expanded ? 'Collapse' : 'Expand' }}
        </button>
      </div>
    </section>

    <div v-bind="displace({ block: 'bottom' })">
      <nav class="toolbar" aria-label="Displaced toolbar">
        <button type="button">Back</button>
        <button type="button">Share</button>
      </nav>
    </div>
  </main>
</template>
