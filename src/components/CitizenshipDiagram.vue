<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { api, type CitizenshipChange, type Country } from '../services/api'

interface Props {
  changes: CitizenshipChange[]
  username: string
}

const props = defineProps<Props>()
const countryMap = ref<Map<string, Country>>(new Map())

const sortedChanges = computed(() => {
  return [...props.changes].sort((a, b) => {
    const dateA = a.timestamp || a.createdAt || (a as any).date || ''
    const dateB = b.timestamp || b.createdAt || (b as any).date || ''
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
})

const formatDate = (change: CitizenshipChange) => {
  const dateString = change.timestamp || change.createdAt || (change as any).date
  if (!dateString) return 'Unknown date'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCountryInfo = (change: CitizenshipChange, type: 'from' | 'to'): { name: string, flagUrl?: string } => {
  const countryId = type === 'from'
    ? (change.data?.fromCountryId || change.data?.from)
    : (change.data?.toCountryId || change.data?.to)

  if (countryId && countryMap.value.has(countryId)) {
    const country = countryMap.value.get(countryId)!
    return {
      name: country.name,
      flagUrl: country.flagUrl
    }
  }

  const countryName = type === 'from'
    ? (change.data?.fromCountryName || change.data?.fromCountryId || change.data?.from || 'Unknown')
    : (change.data?.toCountryName || change.data?.toCountryId || change.data?.to || 'Unknown')

  return { name: countryName }
}

onMounted(async () => {
  const countryIds = new Set<string>()

  props.changes.forEach(change => {
    if (change.data?.fromCountryId) countryIds.add(change.data.fromCountryId)
    if (change.data?.toCountryId) countryIds.add(change.data.toCountryId)
    // Fallback to old field names if they exist
    if (change.data?.from) countryIds.add(change.data.from)
    if (change.data?.to) countryIds.add(change.data.to)
  })

  for (const countryId of countryIds) {
    const country = await api.getCountryById(countryId)
    if (country) {
      countryMap.value.set(countryId, country)
    }
  }
})
</script>

<template>
  <div class="citizenship-diagram">
    <h6 class="subtitle is-6 mb-4">Citizenship History ({{ changes.length }} changes)</h6>

    <div class="timeline">
      <div
        v-for="(change, index) in sortedChanges"
        :key="change._id || index"
        class="timeline-item"
      >
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="is-flex is-align-items-center mb-3">
            <span class="tag is-info mr-2">{{ index + 1 }}</span>
            <span class="is-size-7 has-text-grey">{{ formatDate(change) }}</span>
          </div>

          <div class="citizenship-change-card">
            <div class="columns is-vcentered is-mobile">
              <div class="column is-5 has-text-right">
                <span class="country-badge from-country">
                  <img
                    v-if="getCountryInfo(change, 'from').flagUrl"
                    :src="getCountryInfo(change, 'from').flagUrl"
                    :alt="getCountryInfo(change, 'from').name"
                    class="country-flag mr-2"
                  />
                  {{ getCountryInfo(change, 'from').name }}
                </span>
              </div>
              <div class="column is-2 has-text-centered">
                <span class="icon has-text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    />
                  </svg>
                </span>
              </div>
              <div class="column is-5">
                <span class="country-badge to-country">
                  <img
                    v-if="getCountryInfo(change, 'to').flagUrl"
                    :src="getCountryInfo(change, 'to').flagUrl"
                    :alt="getCountryInfo(change, 'to').name"
                    class="country-flag mr-2"
                  />
                  {{ getCountryInfo(change, 'to').name }}
                </span>
              </div>
            </div>

            <div v-if="change.data && Object.keys(change.data).length > 2" class="mt-3">
              <details class="change-details">
                <summary class="has-text-grey is-size-7">Additional Details</summary>
                <pre class="mt-2 mb-0"><code>{{ JSON.stringify(change.data, null, 2) }}</code></pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sortedChanges.length === 0" class="has-text-grey has-text-centered py-5">
      No citizenship changes recorded.
    </div>
  </div>
</template>

<style scoped>
.citizenship-diagram {
  padding: 1rem;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #dee2e6;
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-marker {
  position: absolute;
  left: -24px;
  top: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0d6efd;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #0d6efd;
}

.timeline-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.citizenship-change-card {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.country-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.9rem;
}

.country-flag {
  height: 20px;
  width: auto;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.from-country {
  background: #ffeaa7;
  color: #2d3436;
  border: 2px solid #fdcb6e;
}

.to-country {
  background: #dfe6e9;
  color: #2d3436;
  border: 2px solid #b2bec3;
}

.change-details summary {
  cursor: pointer;
  user-select: none;
}

.change-details summary:hover {
  color: #0d6efd !important;
}

.change-details pre {
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>
