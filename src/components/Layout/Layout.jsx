import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import Routers from '../Routers/Routers'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
function Layout() {
  return (
    <Router>
      <Header/>
      <div>
        <Routers/>
      </div>
      <Footer/>
    </Router>
  )
}

export default Layout
