import './App.css'
import Layout from './components/Layout/Layout'
import { StoreProvider } from './components/Dashboards/Admin/StoreContext';
function App() {
  return (
    <StoreProvider>
      <Layout/>
    </StoreProvider>
  )
}

export default App
