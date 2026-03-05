import { useEffect } from 'react';
import Dashboard from '../Dashboard';
import { useSection } from '../../context/SectionContext';

const MailyDashboard = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('maily-academia');
  }, [setCurrentSection]);

  return <Dashboard />;
};

export default MailyDashboard;

