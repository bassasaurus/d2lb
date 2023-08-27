import { create } from 'zustand'

const useBearStore = create((set) => ({
    offlineFlights: [],
    showStore: () => console.log(offlineFlights)
  }))

export default useBearStore;