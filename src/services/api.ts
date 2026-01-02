import axios from 'axios'

const API_BASE_URL = 'https://api2.warera.io/trpc'

export interface Country {
  _id: string
  name: string
  code?: string
  flagUrl?: string
  [key: string]: any
}

export interface UserLite {
  _id: string
  username: string
  lastPlayed?: string
  active?: boolean
  [key: string]: any
}

export interface CitizenshipChange {
  _id: string
  user: string
  country: string
  createdAt: string
  updatedAt: string
  timestamp?: string
  data?: {
    action?: string
    fromCountryId?: string
    toCountryId?: string
    reason?: string
    from?: string
    to?: string
    fromCountryName?: string
    toCountryName?: string
    [key: string]: any
  }
  [key: string]: any
}

export interface ActionLogResponse {
  items: CitizenshipChange[]
  nextCursor?: string
}

export interface UsersResponse {
  items: UserLite[]
  nextCursor?: string
}

export class WarEraAPI {
  private authToken: string = ''
  private countryCache: Map<string, Country> = new Map()

  setAuthToken(token: string) {
    this.authToken = token
  }

  getCountryFromCache(countryId: string): Country | undefined {
    return this.countryCache.get(countryId)
  }

  async getCountryById(countryId: string): Promise<Country | null> {
    if (this.countryCache.has(countryId)) {
      return this.countryCache.get(countryId)!
    }

    try {
      const input = { countryId }
      const url = this.buildUrl('country.getCountryById', input)
      const response = await axios.get(url)
      const country = response.data.result.data

      if (country.code) {
        country.flagUrl = `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
      }

      this.countryCache.set(countryId, country)
      return country
    } catch (error) {
      console.error(`Error fetching country ${countryId}:`, error)
      return null
    }
  }

  private buildUrl(endpoint: string, input: any): string {
    const encodedInput = encodeURIComponent(JSON.stringify(input))
    return `${API_BASE_URL}/${endpoint}?input=${encodedInput}`
  }

  async getUsersByCountry(countryId: string, cursor: string = '', limit: number = 100): Promise<UsersResponse> {
    const input = { countryId, cursor, limit }
    const url = this.buildUrl('user.getUsersByCountry', input)
    const response = await axios.get(url)
    return response.data.result.data
  }

  async getUserLite(userId: string): Promise<UserLite> {
    const input = { userId }
    const url = this.buildUrl('user.getUserLite', input)
    const response = await axios.get(url)
    const userData = response.data.result.data

    // Check if user is active (played within last 10 days)
    if (userData.dates?.lastConnectionAt) {
      const lastPlayedDate = new Date(userData.dates.lastConnectionAt)
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
      userData.active = lastPlayedDate >= tenDaysAgo
    } else {
      userData.active = false
    }

    return userData
  }

  async getCitizenshipChanges(userId: string, cursor: string = ''): Promise<ActionLogResponse> {
    if (!this.authToken) {
      throw new Error('Authorization token is required for this operation')
    }

    const input = {
      limit: 100,
      userId,
      actionType: 'changedCitizenship',
      direction: 'forward',
      cursor
    }

    const url = this.buildUrl('actionLog.getPaginated', input)
    const response = await axios.get(url, {
      headers: {
        'Authorization': this.authToken
      }
    })

    return response.data.result.data
  }

  async getAllCountries(): Promise<Country[]> {
    try {
      const input = {}
      const url = this.buildUrl('country.getAllCountries', input)
      const response = await axios.get(url)
      const countries = response.data.result.data

      countries.forEach((country: Country) => {
        if (country.code) {
          country.flagUrl = `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
        }
        this.countryCache.set(country._id, country)
      })

      return countries
    } catch (error) {
      console.error('Error fetching countries:', error)
      return []
    }
  }
}

export const api = new WarEraAPI()
