import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { analyzeVolunteers, type Config, type VolunteerAnalysis } from '../api'
import { getDistrictSchoolCount } from '../context'

const STORAGE_KEY = 'xiaoshengchu-volunteers-v1'

interface StoredData {
  districtId: string | null
  volunteers: (string | null)[]
  lastUpdated: string
}

const EMPTY_ANALYSIS: VolunteerAnalysis = {
  overallScore: 0,
  riskLevel: 'high',
  suggestions: [],
  breakdown: [],
}

interface Options {
  config: Config
  accessTicket: string | null
  isAuthenticated: boolean
}

export function useVolunteers({ config, accessTicket, isAuthenticated }: Options) {
  const [districtId, setDistrictId] = useState<string | null>(null)
  const [volunteers, setVolunteers] = useState<(string | null)[]>([])
  const [analysis, setAnalysis] = useState<VolunteerAnalysis>(EMPTY_ANALYSIS)

  const volunteerCount = useMemo(() => {
    if (!districtId) return 0
    return getDistrictSchoolCount(config, districtId)
  }, [config, districtId])

  // 从 localStorage 加载一次
  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const data: StoredData = JSON.parse(stored)
      if (!data.districtId) return
      setDistrictId(data.districtId)
      const count = getDistrictSchoolCount(config, data.districtId)
      const loaded = new Array(count).fill(null)
      if (Array.isArray(data.volunteers)) {
        data.volunteers.forEach((v, i) => {
          if (i < loaded.length) loaded[i] = v
        })
      }
      setVolunteers(loaded)
    } catch {
      // ignore
    }
  }, [config])

  const saveToStorage = useCallback(
    (newDistrictId: string | null, newVolunteers: (string | null)[]) => {
      try {
        const data: StoredData = {
          districtId: newDistrictId,
          volunteers: newVolunteers,
          lastUpdated: new Date().toISOString(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // ignore
      }
    },
    [],
  )

  const updateDistrict = useCallback(
    (newDistrictId: string | null) => {
      setDistrictId(newDistrictId)
      const count = newDistrictId ? getDistrictSchoolCount(config, newDistrictId) : 0
      const empty = new Array(count).fill(null)
      setVolunteers(empty)
      saveToStorage(newDistrictId, empty)
    },
    [config, saveToStorage],
  )

  const updateVolunteer = useCallback(
    (index: number, schoolId: string | null) => {
      setVolunteers((prev) => {
        const next = [...prev]
        next[index] = schoolId
        if (schoolId === null) {
          for (let i = index + 1; i < next.length; i++) next[i] = null
        }
        saveToStorage(districtId, next)
        return next
      })
    },
    [districtId, saveToStorage],
  )

  const clearVolunteers = useCallback(() => {
    const empty = new Array(volunteerCount).fill(null)
    setVolunteers(empty)
    saveToStorage(districtId, empty)
  }, [districtId, volunteerCount, saveToStorage])

  const resetAll = useCallback(() => {
    setDistrictId(null)
    setVolunteers([])
    setAnalysis(EMPTY_ANALYSIS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const filledCount = useMemo(() => volunteers.filter((v) => v !== null).length, [volunteers])

  // 监听 volunteers 变化，防抖 300ms 调后端 /analyze
  useEffect(() => {
    if (filledCount === 0) {
      setAnalysis(EMPTY_ANALYSIS)
      return
    }
    const ticket = isAuthenticated ? undefined : accessTicket ?? undefined
    const handle = setTimeout(() => {
      analyzeVolunteers(districtId, volunteers, ticket)
        .then(setAnalysis)
        .catch(() => {
          /* ignore transient errors */
        })
    }, 300)
    return () => clearTimeout(handle)
  }, [districtId, volunteers, filledCount, accessTicket, isAuthenticated])

  const isSchoolSelected = useCallback(
    (schoolId: string) => volunteers.includes(schoolId),
    [volunteers],
  )

  const getSchoolPosition = useCallback(
    (schoolId: string): number | null => {
      const idx = volunteers.indexOf(schoolId)
      return idx >= 0 ? idx + 1 : null
    },
    [volunteers],
  )

  return {
    districtId,
    volunteers,
    volunteerCount,
    filledCount,
    analysis,
    updateDistrict,
    updateVolunteer,
    clearVolunteers,
    resetAll,
    isSchoolSelected,
    getSchoolPosition,
  }
}
