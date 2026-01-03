<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Country } from '../services/api'

interface Props {
  modelValue: string
  countries: Country[]
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Choose a country',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')

const selectedCountry = computed(() => {
  return props.countries.find(c => c._id === props.modelValue)
})

const filteredCountries = computed(() => {
  if (!searchQuery.value) return props.countries
  const query = searchQuery.value.toLowerCase()
  return props.countries.filter(c =>
    c.name.toLowerCase().includes(query)
  )
})

const selectCountry = (countryId: string) => {
  emit('update:modelValue', countryId)
  isOpen.value = false
  searchQuery.value = ''
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) {
      searchQuery.value = ''
    }
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}
</script>

<template>
  <div class="country-select" :class="{ 'is-active': isOpen, 'is-disabled': disabled }">
    <div class="select-trigger" @click="toggleDropdown">
      <div v-if="selectedCountry" class="selected-country">
        <img
          v-if="selectedCountry.flagUrl"
          :src="selectedCountry.flagUrl"
          :alt="selectedCountry.name"
          class="flag-icon"
        />
        <span>{{ selectedCountry.name }}</span>
      </div>
      <div v-else class="placeholder">
        {{ placeholder }}
      </div>
      <span class="dropdown-icon">▼</span>
    </div>

    <div v-if="isOpen" class="dropdown-panel">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="input is-small"
          placeholder="Search countries..."
          @click.stop
        />
      </div>
      <div class="dropdown-content">
        <div
          class="dropdown-item"
          @click="selectCountry('')"
        >
          <span class="placeholder-option">{{ placeholder }}</span>
        </div>
        <div
          v-for="country in filteredCountries"
          :key="country._id"
          class="dropdown-item"
          :class="{ 'is-selected': country._id === modelValue }"
          @click="selectCountry(country._id)"
        >
          <img
            v-if="country.flagUrl"
            :src="country.flagUrl"
            :alt="country.name"
            class="flag-icon"
          />
          <span>{{ country.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="isOpen" class="dropdown-backdrop" @click="closeDropdown"></div>
  </div>
</template>

<style scoped>
.country-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  min-height: 2.5em;
  transition: border-color 0.2s;
}

.select-trigger:hover {
  border-color: #b5b5b5;
}

.country-select.is-active .select-trigger {
  border-color: #485fc7;
}

.country-select.is-disabled .select-trigger {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.5;
}

.selected-country {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.placeholder {
  color: #7a7a7a;
}

.placeholder-option {
  color: #7a7a7a;
  font-style: italic;
}

.dropdown-icon {
  margin-left: auto;
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.country-select.is-active .dropdown-icon {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 0.5rem;
  border-bottom: 1px solid #dbdbdb;
}

.dropdown-content {
  overflow-y: auto;
  max-height: 250px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.is-selected {
  background-color: #eff1fa;
  font-weight: 500;
}

.flag-icon {
  width: 24px;
  height: 16px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}
</style>
