import { useEffect } from 'react';
import Dashboard from '../Dashboard';
import { useSection } from '../../context/SectionContext';

const CorporativoDashboard = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('corporativo-camsa');
  }, [setCurrentSection]);

  return <Dashboard />;
};

export default CorporativoDashboard;

