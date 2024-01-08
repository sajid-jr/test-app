import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ChatBotWrapper from './ChatBotWrapper';
import './App.scss'
function App() {
  return (
    <Router>
      <Routes>
        <Route path='/:botId' element={<ChatBotWrapper />}></Route>
        <Route path="*" element={<ChatBotWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;