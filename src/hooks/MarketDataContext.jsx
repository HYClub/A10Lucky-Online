import { createContext, useContext } from 'react'
import { useMarketData } from './useMarketData.js'

const Context = createContext(null)

export function useSharedMarketData() {
  return useContext(Context)
}

export function MarketDataProvider({ children }) {
  const data = useMarketData()
  return <Context.Provider value={data}>{children}</Context.Provider>
}
