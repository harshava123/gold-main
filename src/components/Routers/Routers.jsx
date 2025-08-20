import React from 'react'
import {Routes, Route} from 'react-router-dom'
import Adminfile from '../Dashboards/Admin/Adminfile'
import AdminMainDashboard from '../Dashboards/Admin/AdminMainDashboard'
import Admintokens from '../Dashboards/Admin/Admintokens'
import Reports from '../Dashboards/Admin/Reports'
import Silverreserves from '../Dashboards/Admin/Silverreserves'
import Goldreservers from '../Dashboards/Admin/Goldreservers'
import Emptokens from '../Dashboards/Employee/Emptokens'
import Exchanges from '../Dashboards/Employee/Exchanges'
import Ordermanage from '../Dashboards/Employee/Ordermanage'
import Purchases from '../Dashboards/Employee/Purchases'
import Sales from '../Dashboards/Employee/Sales'
import Testreports from '../Dashboards/Employee/Testreports'
import EmployeeReports from '../Dashboards/Employee/EmployeeReports'
import Login from '../Dashboards/Login/Login'
import Admindashboard from '../Dashboards/Admin/Admindashboard'
import Employeedashboard from '../Dashboards/Employee/Employeedashboard'
import ExchangeConfirm from '../Dashboards/Employee/ExchangeConfirm';
import PurchaseConfirm from '../Dashboards/Employee/PurchaseConfirm';
import SalesConfirm from '../Dashboards/Employee/SaleConfirm';
function Routers() {
  return (
    <Routes>
      <Route path='/admin' element={<Admindashboard/>}/>
      <Route path='/employee' element={<Employeedashboard/>}/>


      <Route path='/' element={<Login/>}/>
      <Route path='/admin/file' element={<Adminfile/>}/>
      <Route path='/admin/tokens' element={<Admintokens/>}/>
      <Route path='/admin/reports' element={<Reports/>}/>
      <Route path='/admin/silver-reserves' element={<Silverreserves/>}/>
      <Route path='/admin/gold-reserves' element={<Goldreservers/>}/>
      <Route path='/admin/dashboard' element={<AdminMainDashboard/>}/>



      <Route path='/employee/sales' element={<Sales/>}/>
      <Route path='/employee/tokens' element={<Emptokens/>}/>
      <Route path='/employee/exchanges' element={<Exchanges/>}/>
      <Route path='/employee/exchanges/confirm' element={<ExchangeConfirm/>}/>
      <Route path='/employee/purchases' element={<Purchases/>}/>
      <Route path='/employee/purchases/confirm' element={<PurchaseConfirm/>}/>
      <Route path='/employee/sales/confirm' element={<SalesConfirm/>}/>
      <Route path='/employee/order-management' element={<Ordermanage/>}/>
      <Route path='/employee/reports' element={<EmployeeReports/>}/>
    
    </Routes>
  )
}

export default Routers