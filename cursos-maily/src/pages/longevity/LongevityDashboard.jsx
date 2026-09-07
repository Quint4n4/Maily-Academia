import { useEffect } from 'react';
import Dashboard from '../Dashboard';
import { useSection } from '../../context/SectionContext';

const LongevityDashboard = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('longevity-360');
  }, [setCurrentSection]);

  return <Dashboard />;
};

export default LongevityDashboard;

