import { createContext, useContext, type ReactNode } from 'react'
import type { Config, School } from './api'

interface XiaoshengchuContextValue {
  config: Config
  accessTicket: string | null
  isAuthenticated: boolean
}

const Ctx = createContext<XiaoshengchuContextValue | null>(null)

export function XiaoshengchuConfigProvider({
  config,
  accessTicket,
  isAuthenticated,
  children,
}: {
  config: Config
  accessTicket: string | null
  isAuthenticated: boolean
  children: ReactNode
}) {
  return (
    <Ctx.Provider value={{ config, accessTicket, isAuthenticated }}>
      {children}
    </Ctx.Provider>
  )
}

export function useXiaoshengchuConfig() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useXiaoshengchuConfig must be used inside XiaoshengchuConfigProvider')
  return ctx
}

// 辅助函数：按 districtId 返回公办+民办学校
export function getSchoolsByDistrict(
  config: Config,
  districtId: string,
): { public: School[]; private: School[] } {
  const d = config.districts.find((x) => x.id === districtId)
  if (!d) return { public: [], private: [] }
  return {
    public: d.publicSchools.map((id) => config.schools[id]).filter(Boolean),
    private: d.privateSchools.map((id) => config.schools[id]).filter(Boolean),
  }
}

export function getSchoolColorType(school: School) {
  return school.colorType
}

export function getDistrictSchoolCount(config: Config, districtId: string): number {
  const d = config.districts.find((x) => x.id === districtId)
  return d ? d.publicSchools.length + d.privateSchools.length : 0
}
