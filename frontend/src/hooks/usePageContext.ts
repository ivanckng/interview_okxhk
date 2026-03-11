import { useLocation } from 'react-router-dom';

export const usePageContext = () => {
  const location = useLocation();

  const getPageContext = (): string => {
    const path = location.pathname.replace('/', '');
    
    if (path === '' || path === 'pulse') return 'pulse';
    if (path === 'news') return 'news';
    if (path === 'markets') return 'markets';
    if (path === 'company') return 'company';
    if (path === 'crypto') return 'crypto';
    
    return 'general';
  };

  return {
    pathname: location.pathname,
    pageContext: getPageContext()
  };
};
