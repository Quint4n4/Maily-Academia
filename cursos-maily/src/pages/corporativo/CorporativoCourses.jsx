import { useEffect } from 'react';
import CoursesList from '../CoursesList';
import { useSection } from '../../context/SectionContext';

const CorporativoCourses = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    setCurrentSection('corporativo-camsa');
  }, [setCurrentSection]);

  return <CoursesList sectionSlug="corporativo-camsa" />;
};

export default CorporativoCourses;

