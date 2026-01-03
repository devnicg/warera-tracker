<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api, type Country, type UserLite, type CitizenshipChange } from '../services/api'
import CitizenshipDiagram from '../components/CitizenshipDiagram.vue'
import CountrySelect from '../components/CountrySelect.vue'

interface PlayerData {
  user: UserLite
  citizenshipChanges: CitizenshipChange[]
  loading: boolean
  error?: string
}

interface FlattenedChange {
  username: string
  userId: string
  change: CitizenshipChange
  fromCountryId?: string
  toCountryId?: string
  date: Date
}

const authToken = ref('')
const countries = ref<Country[]>([])
const selectedCountryId = ref('')
const loading = ref(false)
const loadingCountries = ref(false)
const players = ref<PlayerData[]>([])
const error = ref('')
const progress = ref({ current: 0, total: 0 })
const stats = ref({ total: 0, active: 0, inactive: 0 })
const sortOrder = ref<'asc' | 'desc'>('desc')
const viewMode = ref<'detailed' | 'overview'>('overview')
const filterSourceCountryId = ref('')
const filterDestinationCountryId = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

const sortedCountries = computed(() => {
  return [...countries.value].sort((a, b) => a.name.localeCompare(b.name))
})

const allChanges = computed<FlattenedChange[]>(() => {
  const changes: FlattenedChange[] = []

  players.value.forEach(player => {
    player.citizenshipChanges.forEach(change => {
      changes.push({
        username: player.user.username,
        userId: player.user._id,
        change,
        fromCountryId: change.data?.fromCountryId || change.data?.from,
        toCountryId: change.data?.toCountryId || change.data?.to,
        date: new Date(change.createdAt || change.timestamp || '')
      })
    })
  })

  return changes.sort((a, b) => {
    if (sortOrder.value === 'desc') {
      return b.date.getTime() - a.date.getTime()
    }
    return a.date.getTime() - b.date.getTime()
  })
})

const filteredChanges = computed<FlattenedChange[]>(() => {
  let changes = allChanges.value

  if (filterSourceCountryId.value) {
    changes = changes.filter(change => change.fromCountryId === filterSourceCountryId.value)
  }

  if (filterDestinationCountryId.value) {
    changes = changes.filter(change => change.toCountryId === filterDestinationCountryId.value)
  }

  if (filterStartDate.value) {
    const startDate = new Date(filterStartDate.value)
    startDate.setHours(0, 0, 0, 0)
    changes = changes.filter(change => change.date >= startDate)
  }

  if (filterEndDate.value) {
    const endDate = new Date(filterEndDate.value)
    endDate.setHours(23, 59, 59, 999)
    changes = changes.filter(change => change.date <= endDate)
  }

  return changes
})

const groupedChanges = computed(() => {
  const groups = new Map<string, FlattenedChange[]>()

  filteredChanges.value.forEach(change => {
    if (!groups.has(change.username)) {
      groups.set(change.username, [])
    }
    groups.get(change.username)!.push(change)
  })

  return Array.from(groups.entries()).map(([username, changes]) => ({
    username,
    userId: changes[0].userId,
    changes
  }))
})

const getCountryName = (countryId?: string): string => {
  if (!countryId) return 'Unknown'
  const country = api.getCountryFromCache(countryId)
  return country?.name || countryId
}

const getCountryFlag = (countryId?: string): string | undefined => {
  if (!countryId) return undefined
  const country = api.getCountryFromCache(countryId)
  return country?.flagUrl
}

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

const formatDate = (date: Date): string => {
  if (isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUserProfileUrl = (userId: string): string => {
  return `https://app.warera.io/user/${userId}`
}

onMounted(async () => {
  loadingCountries.value = true
  try {
    countries.value = await api.getAllCountries()
  } catch (err) {
    error.value = 'Failed to load countries: ' + (err as Error).message
  } finally {
    loadingCountries.value = false
  }
})

const handleAuthTokenChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  authToken.value = target.value
  api.setAuthToken(target.value)
}

const fetchPlayersAndChanges = async () => {
  if (!selectedCountryId.value) {
    error.value = 'Please select a country'
    return
  }

  if (!authToken.value) {
    error.value = 'Please enter an authorization token'
    return
  }

  loading.value = true
  error.value = ''
  players.value = []
  progress.value = { current: 0, total: 0 }
  stats.value = { total: 0, active: 0, inactive: 0 }

  try {
    const usersResponse = await api.getUsersByCountry(selectedCountryId.value)
    const allUsers = usersResponse.items || []
    progress.value.total = allUsers.length
    stats.value.total = allUsers.length

    for (const user of allUsers) {
      progress.value.current++

      try {
        const userLite = await api.getUserLite(user._id)

        if (!userLite.active) {
          stats.value.inactive++
          continue
        }

        stats.value.active++

        const playerData: PlayerData = {
          user: userLite,
          citizenshipChanges: [],
          loading: true
        }

        players.value.push(playerData)

        try {
          const changesResponse = await api.getCitizenshipChanges(user._id)
          playerData.citizenshipChanges = changesResponse.items || []
          playerData.loading = false
        } catch (err) {
          playerData.error = 'Failed to load citizenship changes: ' + (err as Error).message
          playerData.loading = false
        }
      } catch (err) {
        console.error(`Error fetching user ${user._id}:`, err)
      }
    }
  } catch (err) {
    error.value = 'Failed to fetch players: ' + (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="section">
    <div class="container">
      <h1 class="title">Citizenship Tracker</h1>

      <div class="box mb-4">
        <div class="field">
          <label class="label">Authorization Token</label>
          <div class="control">
            <input
              class="input"
              type="text"
              placeholder="Enter your authorization token"
              :value="authToken"
              @input="handleAuthTokenChange"
            />
          </div>
          <p class="help">Required for fetching citizenship change logs</p>
        </div>

        <div class="field">
          <label class="label">Select Nation</label>
          <div class="control">
            <CountrySelect
              v-model="selectedCountryId"
              :countries="sortedCountries"
              :placeholder="loadingCountries ? 'Loading countries...' : 'Choose a country'"
              :disabled="loadingCountries"
            />
          </div>
        </div>

        <div class="field">
          <div class="control">
            <button
              class="button is-primary"
              :class="{ 'is-loading': loading }"
              @click="fetchPlayersAndChanges"
              :disabled="loading || !selectedCountryId || !authToken"
            >
              {{ loading ? 'Loading...' : 'Fetch Players' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="notification is-danger">
        {{ error }}
      </div>

      <div v-if="loading" class="notification is-info">
        <div>Processing players: {{ progress.current }} / {{ progress.total }}</div>
        <progress
          class="progress is-primary mt-2"
          :value="progress.current"
          :max="progress.total"
        >
          {{ Math.round((progress.current / progress.total) * 100) }}%
        </progress>
      </div>

      <div v-if="!loading && stats.total > 0" class="notification is-info is-light">
        <strong>Summary:</strong> Found {{ stats.total }} total players -
        {{ stats.active }} active, {{ stats.inactive }} inactive (filtered out)
      </div>

      <div v-if="players.length > 0" class="mt-5">
        <div class="level mb-4">
          <div class="level-left">
            <div class="level-item">
              <h3 class="title is-4">Citizenship Changes ({{ filteredChanges.length }} of {{ allChanges.length }} total)</h3>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item">
              <div class="buttons has-addons">
                <button
                  class="button"
                  :class="{ 'is-primary': viewMode === 'overview' }"
                  @click="viewMode = 'overview'"
                >
                  Overview
                </button>
                <button
                  class="button"
                  :class="{ 'is-primary': viewMode === 'detailed' }"
                  @click="viewMode = 'detailed'"
                >
                  Detailed
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="box mb-4">
          <h4 class="title is-5 mb-3">Filters</h4>
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">Source Country (From)</label>
                <div class="control">
                  <CountrySelect
                    v-model="filterSourceCountryId"
                    :countries="sortedCountries"
                    placeholder="All countries"
                  />
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Destination Country (To)</label>
                <div class="control">
                  <CountrySelect
                    v-model="filterDestinationCountryId"
                    :countries="sortedCountries"
                    placeholder="All countries"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">Start Date</label>
                <div class="control">
                  <input
                    class="input"
                    type="date"
                    v-model="filterStartDate"
                  />
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">End Date</label>
                <div class="control">
                  <input
                    class="input"
                    type="date"
                    v-model="filterEndDate"
                  />
                </div>
              </div>
            </div>
            <div class="column is-narrow" style="display: flex; align-items: flex-end;">
              <div class="field">
                <div class="control">
                  <button
                    class="button is-light"
                    @click="filterSourceCountryId = ''; filterDestinationCountryId = ''; filterStartDate = ''; filterEndDate = ''"
                    :disabled="!filterSourceCountryId && !filterDestinationCountryId && !filterStartDate && !filterEndDate"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Overview Table -->
        <div v-if="viewMode === 'overview'">
          <div class="mb-3 has-text-right">
            <button class="button is-small" @click="toggleSort">
              Sort by Date
              <span v-if="sortOrder === 'desc'">↓ Newest First</span>
              <span v-else>↑ Oldest First</span>
            </button>
          </div>

          <div v-for="group in groupedChanges" :key="group.userId" class="box mb-4">
            <div class="level mb-3">
              <div class="level-left">
                <div class="level-item">
                  <h5 class="title is-5">
                    <a :href="getUserProfileUrl(group.userId)" target="_blank" class="has-text-link">
                      {{ group.username }}
                    </a>
                  </h5>
                </div>
              </div>
              <div class="level-right">
                <div class="level-item">
                  <span class="tag is-info">{{ group.changes.length }} change(s)</span>
                </div>
              </div>
            </div>

            <div class="table-container">
              <table class="table is-fullwidth is-hoverable">
                <thead>
                  <tr>
                    <th>From</th>
                    <th style="width: 30px;"></th>
                    <th>To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in group.changes" :key="index">
                    <td>
                      <div class="is-flex is-align-items-center">
                        <img
                          v-if="getCountryFlag(item.fromCountryId)"
                          :src="getCountryFlag(item.fromCountryId)"
                          :alt="getCountryName(item.fromCountryId)"
                          class="country-flag-small mr-2"
                        />
                        <span>{{ getCountryName(item.fromCountryId) }}</span>
                      </div>
                    </td>
                    <td class="has-text-centered">→</td>
                    <td>
                      <div class="is-flex is-align-items-center">
                        <img
                          v-if="getCountryFlag(item.toCountryId)"
                          :src="getCountryFlag(item.toCountryId)"
                          :alt="getCountryName(item.toCountryId)"
                          class="country-flag-small mr-2"
                        />
                        <span>{{ getCountryName(item.toCountryId) }}</span>
                      </div>
                    </td>
                    <td style="white-space: nowrap;">{{ formatDate(item.date) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Detailed View -->
        <div v-if="viewMode === 'detailed'">
          <div v-for="player in players" :key="player.user._id" class="box mb-4">
            <div class="level mb-3">
              <div class="level-left">
                <div class="level-item">
                  <div>
                    <h5 class="title is-5">
                      <a :href="getUserProfileUrl(player.user._id)" target="_blank" class="has-text-link">
                        {{ player.user.username }}
                      </a>
                    </h5>
                    <p class="subtitle is-7">User ID: {{ player.user._id }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="player.loading" class="has-text-centered py-5">
              <button class="button is-loading is-primary is-medium"></button>
            </div>

            <div v-else-if="player.error" class="notification is-warning">
              {{ player.error }}
            </div>

            <div v-else-if="player.citizenshipChanges.length === 0" class="has-text-grey">
              No citizenship changes found for this player.
            </div>

            <CitizenshipDiagram
              v-else
              :changes="player.citizenshipChanges"
              :username="player.user.username"
            />
          </div>
        </div>

        <div v-else-if="!loading && !error" class="notification is-info is-light mt-5">
          Select a country and click "Fetch Players" to begin tracking citizenship changes.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.country-flag-small {
  height: 16px;
  width: auto;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
