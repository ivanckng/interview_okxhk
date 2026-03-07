import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CryptoPage } from './pages/CryptoPage';
import { CompanyPage } from './pages/CompanyPage';
import { NewsPage } from './pages/NewsPage';
import { MarketsPage } from './pages/MarketsPage';
import { PulsePage } from './pages/PulsePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PulsePage />} />
          <Route path="pulse" element={<PulsePage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="markets" element={<MarketsPage />} />
          <Route path="company" element={<CompanyPage />} />
          <Route path="crypto" element={<CryptoPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
